"""Configuration management for voice dictation server using Pydantic Settings."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # STT API Keys (at least one required)
    assemblyai_api_key: str | None = Field(None, description="AssemblyAI API key for STT")
    cartesia_api_key: str | None = Field(None, description="Cartesia API key for STT")
    deepgram_api_key: str | None = Field(None, description="Deepgram API key for STT")

    # LLM API Keys (at least one required)
    openai_api_key: str | None = Field(None, description="OpenAI API key for LLM")
    google_api_key: str | None = Field(None, description="Google API key for Gemini LLM")
    anthropic_api_key: str | None = Field(None, description="Anthropic API key for LLM")
    cerebras_api_key: str | None = Field(None, description="Cerebras API key for LLM")
    groq_api_key: str | None = Field(None, description="Groq API key for LLM")

    # Default providers (used when no preference is set)
    default_stt_provider: str = Field("cartesia", description="Default STT provider")
    default_llm_provider: str = Field("cerebras", description="Default LLM provider")

    # Logging
    log_level: str = Field("INFO", description="Logging level")

    # Dictation Server Configuration
    dictation_server_host: str = Field(
        "127.0.0.1", description="Host for the dictation WebSocket server"
    )
    dictation_server_port: int = Field(8765, description="Port for the dictation WebSocket server")
