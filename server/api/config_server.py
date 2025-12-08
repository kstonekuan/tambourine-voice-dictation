"""FastAPI configuration server for Tambourine settings."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from pydantic import BaseModel

from processors.llm_cleanup import CLEANUP_SYSTEM_PROMPT
from services.providers import (
    LLM_PROVIDER_LABELS,
    STT_PROVIDER_LABELS,
    LLMProvider,
    STTProvider,
)

if TYPE_CHECKING:
    from pipecat.pipeline.llm_switcher import LLMSwitcher
    from pipecat.pipeline.service_switcher import ServiceSwitcher
    from pipecat.services.ai_services import STTService
    from pipecat.services.llm_service import LLMService

    from config.settings import Settings
    from processors.llm_cleanup import TranscriptionToLLMConverter

app = FastAPI(title="Tambourine Config API")

# CORS for Tauri frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared state - will be set by main server
_llm_converter: TranscriptionToLLMConverter | None = None
_stt_switcher: ServiceSwitcher | None = None
_llm_switcher: LLMSwitcher | None = None
_stt_services: dict[STTProvider, STTService] | None = None
_llm_services: dict[LLMProvider, LLMService] | None = None
_settings: Settings | None = None

# Track current active providers
_current_stt_provider: STTProvider | None = None
_current_llm_provider: LLMProvider | None = None


def set_llm_converter(converter: TranscriptionToLLMConverter) -> None:
    """Set the LLM converter reference for runtime prompt updates.

    Args:
        converter: The TranscriptionToLLMConverter instance from the pipeline.
    """
    global _llm_converter
    _llm_converter = converter


def set_service_switchers(
    stt_switcher: ServiceSwitcher,
    llm_switcher: LLMSwitcher,
    stt_services: dict[STTProvider, Any],
    llm_services: dict[LLMProvider, Any],
    settings: Settings,
) -> None:
    """Set the service switcher references for runtime provider switching.

    Args:
        stt_switcher: The STT ServiceSwitcher instance
        llm_switcher: The LLM Switcher instance
        stt_services: Dictionary mapping STT providers to their services
        llm_services: Dictionary mapping LLM providers to their services
        settings: Application settings
    """
    global _stt_switcher, _llm_switcher, _stt_services, _llm_services, _settings
    global _current_stt_provider, _current_llm_provider

    _stt_switcher = stt_switcher
    _llm_switcher = llm_switcher
    _stt_services = stt_services
    _llm_services = llm_services
    _settings = settings

    # Set initial active providers based on settings
    # Pipecat uses the first service in the list as default, so we only override if specified
    if stt_services:
        if settings.default_stt_provider:
            default_stt = STTProvider(settings.default_stt_provider)
            _current_stt_provider = (
                default_stt if default_stt in stt_services else next(iter(stt_services.keys()))
            )
        else:
            _current_stt_provider = next(iter(stt_services.keys()))

    if llm_services:
        if settings.default_llm_provider:
            default_llm = LLMProvider(settings.default_llm_provider)
            _current_llm_provider = (
                default_llm if default_llm in llm_services else next(iter(llm_services.keys()))
            )
        else:
            _current_llm_provider = next(iter(llm_services.keys()))


class PromptUpdate(BaseModel):
    """Request body for updating the cleanup prompt."""

    prompt: str | None


class DefaultPromptResponse(BaseModel):
    """Response for the default prompt endpoint."""

    prompt: str


class CurrentPromptResponse(BaseModel):
    """Response for the current prompt endpoint."""

    prompt: str
    is_custom: bool


class SetPromptResponse(BaseModel):
    """Response for setting the prompt."""

    success: bool
    error: str | None = None


@app.get("/api/prompt/default", response_model=DefaultPromptResponse)
async def get_default_prompt() -> DefaultPromptResponse:
    """Get the built-in default cleanup prompt."""
    return DefaultPromptResponse(prompt=CLEANUP_SYSTEM_PROMPT)


@app.get("/api/prompt/current", response_model=CurrentPromptResponse)
async def get_current_prompt() -> CurrentPromptResponse:
    """Get the currently active cleanup prompt (custom or default)."""
    if _llm_converter:
        return CurrentPromptResponse(
            prompt=_llm_converter.system_prompt,
            is_custom=_llm_converter._custom_prompt is not None,
        )
    return CurrentPromptResponse(prompt=CLEANUP_SYSTEM_PROMPT, is_custom=False)


@app.post("/api/prompt", response_model=SetPromptResponse)
async def set_prompt(data: PromptUpdate) -> SetPromptResponse:
    """Set a custom cleanup prompt or reset to default.

    Args:
        data: The prompt update request. Set prompt to null to reset to default.
    """
    if _llm_converter:
        _llm_converter.set_custom_prompt(data.prompt)
        return SetPromptResponse(success=True)
    return SetPromptResponse(success=False, error="LLM converter not initialized")


# Provider Management Models


class ProviderInfo(BaseModel):
    """Information about a provider."""

    value: str
    label: str


class AvailableProvidersResponse(BaseModel):
    """Response listing available providers."""

    stt: list[ProviderInfo]
    llm: list[ProviderInfo]


class CurrentProvidersResponse(BaseModel):
    """Response for current active providers."""

    stt: str | None
    llm: str | None


class SwitchProviderRequest(BaseModel):
    """Request to switch a provider."""

    provider: str


class SwitchProviderResponse(BaseModel):
    """Response for provider switch."""

    success: bool
    provider: str | None = None
    error: str | None = None


# Provider Endpoints


@app.get("/api/providers/available", response_model=AvailableProvidersResponse)
async def get_available_providers() -> AvailableProvidersResponse:
    """Get list of available STT and LLM providers (those with API keys configured)."""
    stt_providers = []
    llm_providers = []

    if _stt_services:
        stt_providers = [
            ProviderInfo(value=p.value, label=STT_PROVIDER_LABELS.get(p, p.value))
            for p in _stt_services
        ]

    if _llm_services:
        llm_providers = [
            ProviderInfo(value=p.value, label=LLM_PROVIDER_LABELS.get(p, p.value))
            for p in _llm_services
        ]

    return AvailableProvidersResponse(stt=stt_providers, llm=llm_providers)


@app.get("/api/providers/current", response_model=CurrentProvidersResponse)
async def get_current_providers() -> CurrentProvidersResponse:
    """Get currently active STT and LLM providers."""
    return CurrentProvidersResponse(
        stt=_current_stt_provider.value if _current_stt_provider else None,
        llm=_current_llm_provider.value if _current_llm_provider else None,
    )


@app.post("/api/providers/stt", response_model=SwitchProviderResponse)
async def switch_stt_provider(data: SwitchProviderRequest) -> SwitchProviderResponse:
    """Switch to a different STT provider.

    Args:
        data: The provider to switch to.
    """
    global _current_stt_provider

    if not _stt_switcher or not _stt_services:
        return SwitchProviderResponse(success=False, error="STT switcher not initialized")

    try:
        provider = STTProvider(data.provider)
    except ValueError:
        return SwitchProviderResponse(success=False, error=f"Unknown STT provider: {data.provider}")

    if provider not in _stt_services:
        return SwitchProviderResponse(
            success=False, error=f"Provider '{data.provider}' not available (no API key configured)"
        )

    service = _stt_services[provider]
    _stt_switcher.strategy.active_service = service
    _current_stt_provider = provider

    logger.info("switched_stt_provider", provider=provider.value)
    return SwitchProviderResponse(success=True, provider=provider.value)


@app.post("/api/providers/llm", response_model=SwitchProviderResponse)
async def switch_llm_provider(data: SwitchProviderRequest) -> SwitchProviderResponse:
    """Switch to a different LLM provider.

    Args:
        data: The provider to switch to.
    """
    global _current_llm_provider

    if not _llm_switcher or not _llm_services:
        return SwitchProviderResponse(success=False, error="LLM switcher not initialized")

    try:
        provider = LLMProvider(data.provider)
    except ValueError:
        return SwitchProviderResponse(success=False, error=f"Unknown LLM provider: {data.provider}")

    if provider not in _llm_services:
        return SwitchProviderResponse(
            success=False, error=f"Provider '{data.provider}' not available (no API key configured)"
        )

    service = _llm_services[provider]
    _llm_switcher.strategy.active_service = service
    _current_llm_provider = provider

    logger.info("switched_llm_provider", provider=provider.value)
    return SwitchProviderResponse(success=True, provider=provider.value)
