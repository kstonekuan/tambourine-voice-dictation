"""FastAPI configuration router for Tambourine settings.

This module provides REST endpoints for:
- Getting default prompt sections
- Getting available providers (static configuration)

All runtime pipeline configuration is now handled via WebRTC data channel
through the ConfigurationProcessor. This file only exposes static
configuration data that doesn't require pipeline access.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Request
from pydantic import BaseModel

from processors.llm import (
    ADVANCED_PROMPT_DEFAULT,
    DICTIONARY_PROMPT_DEFAULT,
    MAIN_PROMPT_DEFAULT,
)
from services.provider_registry import (
    LLMProviderId,
    STTProviderId,
    get_llm_provider_labels,
    get_stt_provider_labels,
)

if TYPE_CHECKING:
    from main import AppServices

# Create router for config endpoints
config_router = APIRouter()


# =============================================================================
# Prompt Section Models and Endpoints
# =============================================================================


class DefaultSectionsResponse(BaseModel):
    """Response with default prompts for each section."""

    main: str
    advanced: str
    dictionary: str


@config_router.get("/api/prompt/sections/default", response_model=DefaultSectionsResponse)
async def get_default_sections() -> DefaultSectionsResponse:
    """Get default prompts for each section."""
    return DefaultSectionsResponse(
        main=MAIN_PROMPT_DEFAULT,
        advanced=ADVANCED_PROMPT_DEFAULT,
        dictionary=DICTIONARY_PROMPT_DEFAULT,
    )


# =============================================================================
# Provider Information Endpoints
# =============================================================================


class ProviderInfo(BaseModel):
    """Information about a provider."""

    value: str
    label: str
    is_local: bool
    model: str | None = None


class AvailableProvidersResponse(BaseModel):
    """Response listing available providers."""

    stt: list[ProviderInfo]
    llm: list[ProviderInfo]


@config_router.get("/api/providers/available", response_model=AvailableProvidersResponse)
async def get_available_providers(request: Request) -> AvailableProvidersResponse:
    """Get list of available STT and LLM providers (those with API keys configured).

    This endpoint returns static data configured at server startup.
    """
    services: AppServices = request.app.state.services

    stt_labels = get_stt_provider_labels()
    llm_labels = get_llm_provider_labels()

    stt_providers = [
        ProviderInfo(
            value=provider_id.value,
            label=stt_labels.get(provider_id, provider_id.value),
            is_local=provider_id == STTProviderId.WHISPER,
            model=service.model_name
            if hasattr(service, "model_name") and service.model_name
            else None,
        )
        for provider_id, service in services.stt_services.items()
    ]

    llm_providers = [
        ProviderInfo(
            value=provider_id.value,
            label=llm_labels.get(provider_id, provider_id.value),
            is_local=provider_id == LLMProviderId.OLLAMA,
            model=service.model_name
            if hasattr(service, "model_name") and service.model_name
            else None,
        )
        for provider_id, service in services.llm_services.items()
    ]

    return AvailableProvidersResponse(stt=stt_providers, llm=llm_providers)
