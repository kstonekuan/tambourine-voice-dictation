//! Stub implementation for unsupported platforms (Linux, etc.)
//!
//! This provides a no-op implementation that logs warnings but doesn't fail.

use super::{AudioControlError, SystemAudioControl};
use std::sync::atomic::{AtomicBool, Ordering};

/// Stub audio controller for unsupported platforms.
///
/// All operations succeed but do nothing. Logs a warning on first use.
pub struct StubAudioController {
    warned: AtomicBool,
}

impl StubAudioController {
    pub fn new() -> Self {
        Self {
            warned: AtomicBool::new(false),
        }
    }

    fn warn_once(&self) {
        if !self.warned.swap(true, Ordering::SeqCst) {
            log::warn!(
                "Audio mute not implemented for this platform. \
                Recording will work, but system audio won't be muted."
            );
        }
    }
}

impl SystemAudioControl for StubAudioController {
    fn get_volume(&self) -> Result<f32, AudioControlError> {
        self.warn_once();
        Ok(1.0) // Pretend volume is at 100%
    }

    fn set_volume(&self, _level: f32) -> Result<(), AudioControlError> {
        self.warn_once();
        Ok(())
    }

    fn is_muted(&self) -> Result<bool, AudioControlError> {
        self.warn_once();
        Ok(false) // Pretend not muted
    }

    fn set_muted(&self, _muted: bool) -> Result<(), AudioControlError> {
        self.warn_once();
        Ok(())
    }
}
