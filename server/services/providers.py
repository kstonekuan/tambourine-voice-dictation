"""Provider registry for STT and LLM services."""

from enum import Enum
from typing import TYPE_CHECKING

from loguru import logger
from pipecat.services.llm_service import LLMService
from pipecat.services.stt_service import STTService

if TYPE_CHECKING:
    from config.settings import Settings


class STTProvider(str, Enum):
    """Available Speech-to-Text providers."""

    ASSEMBLYAI = "assemblyai"
    CARTESIA = "cartesia"
    DEEPGRAM = "deepgram"


class LLMProvider(str, Enum):
    """Available Language Model providers."""

    OPENAI = "openai"
    GEMINI = "gemini"
    ANTHROPIC = "anthropic"
    CEREBRAS = "cerebras"
    GROQ = "groq"


# Display names for UI
STT_PROVIDER_LABELS: dict[STTProvider, str] = {
    STTProvider.ASSEMBLYAI: "AssemblyAI",
    STTProvider.CARTESIA: "Cartesia",
    STTProvider.DEEPGRAM: "Deepgram",
}

LLM_PROVIDER_LABELS: dict[LLMProvider, str] = {
    LLMProvider.OPENAI: "OpenAI",
    LLMProvider.GEMINI: "Google Gemini",
    LLMProvider.ANTHROPIC: "Anthropic",
    LLMProvider.CEREBRAS: "Cerebras",
    LLMProvider.GROQ: "Groq",
}


def create_stt_service(provider: STTProvider, settings: "Settings") -> STTService:
    """
    Create an STT service instance for the given provider.

    Args:
        provider: The STT provider to use
        settings: Application settings containing API keys

    Returns:
        Configured STT service instance

    Raises:
        ValueError: If the provider's API key is not configured
    """
    logger.info("creating_stt_service", provider=provider.value)

    if provider == STTProvider.ASSEMBLYAI:
        if not settings.assemblyai_api_key:
            raise ValueError("AssemblyAI API key not configured")
        from pipecat.services.assemblyai.stt import AssemblyAISTTService

        return AssemblyAISTTService(api_key=settings.assemblyai_api_key)

    if provider == STTProvider.CARTESIA:
        if not settings.cartesia_api_key:
            raise ValueError("Cartesia API key not configured")
        from pipecat.services.cartesia.stt import CartesiaSTTService

        return CartesiaSTTService(api_key=settings.cartesia_api_key)

    if provider == STTProvider.DEEPGRAM:
        if not settings.deepgram_api_key:
            raise ValueError("Deepgram API key not configured")
        from pipecat.services.deepgram.stt import DeepgramSTTService

        return DeepgramSTTService(api_key=settings.deepgram_api_key)

    raise ValueError(f"Unknown STT provider: {provider}")


def create_llm_service(provider: LLMProvider, settings: "Settings") -> LLMService:
    """
    Create an LLM service instance for the given provider.

    Args:
        provider: The LLM provider to use
        settings: Application settings containing API keys

    Returns:
        Configured LLM service instance

    Raises:
        ValueError: If the provider's API key is not configured
    """
    logger.info("creating_llm_service", provider=provider.value)

    if provider == LLMProvider.OPENAI:
        if not settings.openai_api_key:
            raise ValueError("OpenAI API key not configured")
        from pipecat.services.openai.llm import OpenAILLMService

        return OpenAILLMService(api_key=settings.openai_api_key)

    if provider == LLMProvider.GEMINI:
        if not settings.google_api_key:
            raise ValueError("Google API key not configured")
        from pipecat.services.google.llm import GoogleLLMService

        return GoogleLLMService(api_key=settings.google_api_key)

    if provider == LLMProvider.ANTHROPIC:
        if not settings.anthropic_api_key:
            raise ValueError("Anthropic API key not configured")
        from pipecat.services.anthropic.llm import AnthropicLLMService

        return AnthropicLLMService(api_key=settings.anthropic_api_key)

    if provider == LLMProvider.CEREBRAS:
        if not settings.cerebras_api_key:
            raise ValueError("Cerebras API key not configured")
        from pipecat.services.cerebras.llm import CerebrasLLMService

        return CerebrasLLMService(
            api_key=settings.cerebras_api_key,
            retry_on_timeout=True,
            retry_timeout_secs=10.0,
        )

    if provider == LLMProvider.GROQ:
        if not settings.groq_api_key:
            raise ValueError("Groq API key not configured")
        from pipecat.services.groq.llm import GroqLLMService

        return GroqLLMService(api_key=settings.groq_api_key)

    raise ValueError(f"Unknown LLM provider: {provider}")


def get_available_stt_providers(settings: "Settings") -> list[STTProvider]:
    """
    Get list of STT providers that have API keys configured.

    Args:
        settings: Application settings

    Returns:
        List of available STT providers
    """
    available: list[STTProvider] = []

    if settings.assemblyai_api_key:
        available.append(STTProvider.ASSEMBLYAI)
    if settings.cartesia_api_key:
        available.append(STTProvider.CARTESIA)
    if settings.deepgram_api_key:
        available.append(STTProvider.DEEPGRAM)

    return available


def get_available_llm_providers(settings: "Settings") -> list[LLMProvider]:
    """
    Get list of LLM providers that have API keys configured.

    Args:
        settings: Application settings

    Returns:
        List of available LLM providers
    """
    available: list[LLMProvider] = []

    if settings.openai_api_key:
        available.append(LLMProvider.OPENAI)
    if settings.google_api_key:
        available.append(LLMProvider.GEMINI)
    if settings.anthropic_api_key:
        available.append(LLMProvider.ANTHROPIC)
    if settings.cerebras_api_key:
        available.append(LLMProvider.CEREBRAS)
    if settings.groq_api_key:
        available.append(LLMProvider.GROQ)

    return available


def create_all_available_stt_services(
    settings: "Settings",
) -> dict[STTProvider, STTService]:
    """
    Create STT service instances for all available providers.

    Args:
        settings: Application settings

    Returns:
        Dictionary mapping provider to service instance
    """
    services: dict[STTProvider, STTService] = {}

    for provider in get_available_stt_providers(settings):
        try:
            services[provider] = create_stt_service(provider, settings)
        except Exception as e:
            logger.warning("failed_to_create_stt_service", provider=provider.value, error=str(e))

    return services


def create_all_available_llm_services(
    settings: "Settings",
) -> dict[LLMProvider, LLMService]:
    """
    Create LLM service instances for all available providers.

    Args:
        settings: Application settings

    Returns:
        Dictionary mapping provider to service instance
    """
    services: dict[LLMProvider, LLMService] = {}

    for provider in get_available_llm_providers(settings):
        try:
            services[provider] = create_llm_service(provider, settings)
        except Exception as e:
            logger.warning("failed_to_create_llm_service", provider=provider.value, error=str(e))

    return services
