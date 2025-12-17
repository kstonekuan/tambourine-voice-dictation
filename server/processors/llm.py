"""LLM-based text formatting processor for dictation using idiomatic Pipecat patterns."""

from typing import Any

from openai.types.chat import (
    ChatCompletionSystemMessageParam,
    ChatCompletionUserMessageParam,
)
from pipecat.frames.frames import (
    Frame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    OutputTransportMessageFrame,
    TextFrame,
    TranscriptionFrame,
)
from pipecat.processors.aggregators.openai_llm_context import (
    OpenAILLMContext,
    OpenAILLMContextFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

from utils.logger import logger

# Main prompt section - Core rules, punctuation, new lines
MAIN_PROMPT_DEFAULT = """You are a dictation formatting assistant. Your task is to format transcribed speech.

## Core Rules
- Remove filler words (um, uh, err, erm, etc.)
- Use punctuation where appropriate
- Capitalize sentences properly
- Keep the original meaning and tone intact
- Do NOT add any new information or change the intent
- Do NOT condense, summarize, or make sentences more concise - preserve the speaker's full expression
- Do NOT answer questions - if the user dictates a question, output the cleaned question, not an answer
- Do NOT respond conversationally or engage with the content - you are a text processor, not a conversational assistant
- Output ONLY the cleaned text, nothing else - no explanations, no quotes, no prefixes

### Good Example
Input: "um so basically I was like thinking we should uh you know update the readme file"
Output: "So basically, I was thinking we should update the readme file."

### Bad Examples

1. Condensing/summarizing (preserve full expression):
   Input: "I really think that we should probably consider maybe going to the store to pick up some groceries"
   Bad: "We should go grocery shopping."
   Good: "I really think that we should probably consider going to the store to pick up some groceries."

2. Answering questions (just clean the question):
   Input: "what is the capital of France"
   Bad: "The capital of France is Paris."
   Good: "What is the capital of France?"

3. Responding conversationally (format, don't engage):
   Input: "hey how are you doing today"
   Bad: "I'm doing well, thank you for asking!"
   Good: "Hey, how are you doing today?"

4. Adding information (keep original intent only):
   Input: "send the email to john"
   Bad: "Send the email to John as soon as possible."
   Good: "Send the email to John."

## Punctuation
Convert spoken punctuation to symbols:
- "comma" = ,
- "period" or "full stop" = .
- "question mark" = ?
- "exclamation point" or "exclamation mark" = !
- "dash" = -
- "em dash" = —
- "quotation mark" or "quote" or "end quote" = "
- "colon" = :
- "semicolon" = ;
- "open parenthesis" or "open paren" = (
- "close parenthesis" or "close paren" = )

Example:
Input: "I can't wait exclamation point Let's meet at seven period"
Output: "I can't wait! Let's meet at seven."

## New Line and Paragraph
- "new line" = Insert a line break
- "new paragraph" = Insert a paragraph break (blank line)

Example:
Input: "Hello, new line, world, new paragraph, bye"
Output: "Hello
world

bye" """

# Advanced prompt section - Backtrack corrections and list formatting
ADVANCED_PROMPT_DEFAULT = """## Backtrack Corrections
When the speaker corrects themselves mid-sentence, use only the corrected version:
- "actually" signals a correction: "at 2 actually 3" = "at 3"
- "scratch that" removes the previous phrase: "cookies scratch that brownies" = "brownies"
- "wait" or "I mean" signal corrections: "on Monday wait Tuesday" = "on Tuesday"
- Natural restatements: "as a gift... as a present" = "as a present"

Examples:
- "Let's do coffee at 2 actually 3" = "Let's do coffee at 3."
- "I'll bring cookies scratch that brownies" = "I'll bring brownies."
- "Send it to John I mean Jane" = "Send it to Jane."

## List Formats
When sequence words are detected, format as a numbered or bulleted list:
- Triggers: "one", "two", "three" or "first", "second", "third"
- Capitalize each list item

Example:
- "My goals are one finish the report two send the presentation three review feedback" =
  "My goals are:
  1. Finish the report
  2. Send the presentation
  3. Review feedback" """

# Dictionary prompt section - Personal word mappings
DICTIONARY_PROMPT_DEFAULT = """## Personal Dictionary
Apply these corrections for technical terms, proper nouns, and custom words.

Entries can be in various formats - interpret flexibly:
- Explicit mappings: "ant row pic = Anthropic"
- Single terms to recognize: Just "LLM" (correct phonetic mismatches)
- Natural descriptions: "The name 'Claude' should always be capitalized"

When you hear terms that sound like entries below, use the correct spelling/form.

### Entries:
Tambourine
LLM
ant row pick = Anthropic
Claude
Pipecat
Tauri"""


def combine_prompt_sections(
    main_custom: str | None,
    advanced_enabled: bool,
    advanced_custom: str | None,
    dictionary_enabled: bool,
    dictionary_custom: str | None,
) -> str:
    """Combine prompt sections into a single prompt.

    The main section is always included. Advanced and dictionary sections
    can be toggled on/off. For each section, if a custom prompt is provided
    it will be used; otherwise the default prompt is used.
    """
    parts: list[str] = []

    # Main section is always included
    parts.append(main_custom if main_custom else MAIN_PROMPT_DEFAULT)

    if advanced_enabled:
        parts.append(advanced_custom if advanced_custom else ADVANCED_PROMPT_DEFAULT)

    if dictionary_enabled:
        parts.append(dictionary_custom if dictionary_custom else DICTIONARY_PROMPT_DEFAULT)

    return "\n\n".join(parts)


class TranscriptionToLLMConverter(FrameProcessor):
    """Converts TranscriptionFrame to OpenAILLMContextFrame for LLM formatting.

    This processor receives accumulated transcription text and converts it
    to an LLM context with the formatting system prompt, triggering the LLM
    service to generate formatted text.
    """

    def __init__(self, **kwargs: Any) -> None:
        """Initialize the converter with default prompt sections."""
        super().__init__(**kwargs)
        # Store individual prompt sections (main is always enabled)
        self._main_custom: str | None = None
        self._advanced_enabled: bool = True
        self._advanced_custom: str | None = None
        self._dictionary_enabled: bool = False
        self._dictionary_custom: str | None = None

    @property
    def system_prompt(self) -> str:
        """Get the combined system prompt from all sections."""
        return combine_prompt_sections(
            main_custom=self._main_custom,
            advanced_enabled=self._advanced_enabled,
            advanced_custom=self._advanced_custom,
            dictionary_enabled=self._dictionary_enabled,
            dictionary_custom=self._dictionary_custom,
        )

    def set_prompt_sections(
        self,
        main_custom: str | None = None,
        advanced_enabled: bool = True,
        advanced_custom: str | None = None,
        dictionary_enabled: bool = False,
        dictionary_custom: str | None = None,
    ) -> None:
        """Update the prompt sections.

        The main section is always enabled. For each section, provide a custom
        prompt to override the default, or None to use the default.

        Args:
            main_custom: Custom prompt for main section, or None for default.
            advanced_enabled: Whether the advanced section is enabled.
            advanced_custom: Custom prompt for advanced section, or None for default.
            dictionary_enabled: Whether the dictionary section is enabled.
            dictionary_custom: Custom prompt for dictionary section, or None for default.
        """
        self._main_custom = main_custom
        self._advanced_enabled = advanced_enabled
        self._advanced_custom = advanced_custom
        self._dictionary_enabled = dictionary_enabled
        self._dictionary_custom = dictionary_custom
        logger.info("Formatting prompt sections updated")

    async def process_frame(self, frame: Frame, direction: FrameDirection) -> None:
        """Convert transcription frames to LLM context frames.

        Args:
            frame: The frame to process
            direction: The direction of frame flow
        """
        await super().process_frame(frame, direction)

        if isinstance(frame, TranscriptionFrame):
            text = frame.text
            if text and text.strip():
                logger.debug(f"Converting transcription to LLM context: {text[:50]}...")

                # Create OpenAI-compatible context with formatting prompt
                context = OpenAILLMContext(
                    messages=[
                        ChatCompletionSystemMessageParam(role="system", content=self.system_prompt),
                        ChatCompletionUserMessageParam(role="user", content=text),
                    ]
                )

                # Push context frame to trigger LLM processing
                await self.push_frame(OpenAILLMContextFrame(context=context), direction)
            return

        # Pass through all other frames unchanged
        await self.push_frame(frame, direction)


class LLMResponseToRTVIConverter(FrameProcessor):
    """Aggregates LLM response and converts to RTVI message for client.

    This processor collects streamed TextFrames between LLMFullResponseStartFrame
    and LLMFullResponseEndFrame, then sends the complete cleaned text as an
    RTVI server message to the client.
    """

    def __init__(self, **kwargs: Any) -> None:
        """Initialize the response converter."""
        super().__init__(**kwargs)
        self._accumulator: str = ""
        self._is_accumulating: bool = False

    async def process_frame(self, frame: Frame, direction: FrameDirection) -> None:
        """Accumulate LLM response and convert to RTVI message.

        Args:
            frame: The frame to process
            direction: The direction of frame flow
        """
        await super().process_frame(frame, direction)

        if isinstance(frame, LLMFullResponseStartFrame):
            # Start accumulating LLM response
            self._accumulator = ""
            self._is_accumulating = True
            return

        if isinstance(frame, TextFrame) and self._is_accumulating:
            # Accumulate text chunks from LLM
            self._accumulator += frame.text
            return

        if isinstance(frame, LLMFullResponseEndFrame):
            # LLM response complete - send cleaned text to client
            self._is_accumulating = False
            cleaned_text = self._accumulator.strip()

            if cleaned_text:
                logger.info(f"Cleaned text: '{cleaned_text}'")

                # Create RTVI message for client
                rtvi_message = {
                    "label": "rtvi-ai",
                    "type": "server-message",
                    "data": {"type": "transcript", "text": cleaned_text},
                }
                await self.push_frame(OutputTransportMessageFrame(message=rtvi_message), direction)

            self._accumulator = ""
            return

        # Pass through all other frames unchanged
        await self.push_frame(frame, direction)
