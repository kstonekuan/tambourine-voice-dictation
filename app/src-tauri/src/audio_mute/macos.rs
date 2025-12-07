//! macOS audio control implementation using CoreAudio.
//!
//! Uses the CoreAudio framework to control the default audio output device's
//! volume and mute state via AudioObject property APIs.

use super::{AudioControlError, SystemAudioControl};
use objc2_core_audio::{
    kAudioDevicePropertyMute, kAudioDevicePropertyScopeOutput, kAudioDevicePropertyVolumeScalar,
    kAudioHardwarePropertyDefaultOutputDevice, kAudioObjectPropertyElementMain,
    kAudioObjectPropertyScopeGlobal, kAudioObjectSystemObject, AudioObjectGetPropertyData,
    AudioObjectGetPropertyDataSize, AudioObjectPropertyAddress, AudioObjectSetPropertyData,
};
use std::ffi::c_void;
use std::ptr::NonNull;

/// macOS audio controller using CoreAudio.
pub struct MacOSAudioController {
    device_id: u32,
}

// SAFETY: CoreAudio APIs are thread-safe
unsafe impl Send for MacOSAudioController {}
unsafe impl Sync for MacOSAudioController {}

impl MacOSAudioController {
    /// Create a new macOS audio controller.
    ///
    /// Gets the default output device ID for subsequent operations.
    pub fn new() -> Result<Self, AudioControlError> {
        let device_id = Self::get_default_output_device()?;
        Ok(Self { device_id })
    }

    /// Get the default audio output device ID.
    fn get_default_output_device() -> Result<u32, AudioControlError> {
        let address = AudioObjectPropertyAddress {
            mSelector: kAudioHardwarePropertyDefaultOutputDevice,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain,
        };

        let mut device_id: u32 = 0;
        let mut size = std::mem::size_of::<u32>() as u32;

        let status = unsafe {
            AudioObjectGetPropertyData(
                kAudioObjectSystemObject,
                NonNull::new(&address as *const _ as *mut _).unwrap(),
                0,
                std::ptr::null(),
                NonNull::new(&mut size as *mut _).unwrap(),
                NonNull::new(&mut device_id as *mut _ as *mut c_void).unwrap(),
            )
        };

        if status != 0 {
            return Err(AudioControlError::InitializationFailed(format!(
                "Failed to get default output device (OSStatus: {})",
                status
            )));
        }

        if device_id == 0 {
            return Err(AudioControlError::InitializationFailed(
                "No default output device found".to_string(),
            ));
        }

        Ok(device_id)
    }

    /// Get a float property from the default output device (channel 0 = master).
    fn get_float_property(&self, selector: u32) -> Result<f32, AudioControlError> {
        let address = AudioObjectPropertyAddress {
            mSelector: selector,
            mScope: kAudioDevicePropertyScopeOutput,
            mElement: kAudioObjectPropertyElementMain, // Channel 0 = master
        };

        let mut value: f32 = 0.0;
        let mut size = std::mem::size_of::<f32>() as u32;

        let status = unsafe {
            AudioObjectGetPropertyData(
                self.device_id,
                NonNull::new(&address as *const _ as *mut _).unwrap(),
                0,
                std::ptr::null(),
                NonNull::new(&mut size as *mut _).unwrap(),
                NonNull::new(&mut value as *mut _ as *mut c_void).unwrap(),
            )
        };

        if status != 0 {
            return Err(AudioControlError::GetPropertyFailed(format!(
                "OSStatus: {}",
                status
            )));
        }

        Ok(value)
    }

    /// Set a float property on the default output device (channel 0 = master).
    fn set_float_property(&self, selector: u32, value: f32) -> Result<(), AudioControlError> {
        let address = AudioObjectPropertyAddress {
            mSelector: selector,
            mScope: kAudioDevicePropertyScopeOutput,
            mElement: kAudioObjectPropertyElementMain, // Channel 0 = master
        };

        let size = std::mem::size_of::<f32>() as u32;

        let status = unsafe {
            AudioObjectSetPropertyData(
                self.device_id,
                NonNull::new(&address as *const _ as *mut _).unwrap(),
                0,
                std::ptr::null(),
                size,
                NonNull::new(&value as *const _ as *mut c_void).unwrap(),
            )
        };

        if status != 0 {
            return Err(AudioControlError::SetPropertyFailed(format!(
                "OSStatus: {}",
                status
            )));
        }

        Ok(())
    }

    /// Get a u32 property from the default output device.
    fn get_u32_property(&self, selector: u32) -> Result<u32, AudioControlError> {
        let address = AudioObjectPropertyAddress {
            mSelector: selector,
            mScope: kAudioDevicePropertyScopeOutput,
            mElement: kAudioObjectPropertyElementMain,
        };

        let mut value: u32 = 0;
        let mut size = std::mem::size_of::<u32>() as u32;

        let status = unsafe {
            AudioObjectGetPropertyData(
                self.device_id,
                NonNull::new(&address as *const _ as *mut _).unwrap(),
                0,
                std::ptr::null(),
                NonNull::new(&mut size as *mut _).unwrap(),
                NonNull::new(&mut value as *mut _ as *mut c_void).unwrap(),
            )
        };

        if status != 0 {
            return Err(AudioControlError::GetPropertyFailed(format!(
                "OSStatus: {}",
                status
            )));
        }

        Ok(value)
    }

    /// Set a u32 property on the default output device.
    fn set_u32_property(&self, selector: u32, value: u32) -> Result<(), AudioControlError> {
        let address = AudioObjectPropertyAddress {
            mSelector: selector,
            mScope: kAudioDevicePropertyScopeOutput,
            mElement: kAudioObjectPropertyElementMain,
        };

        let size = std::mem::size_of::<u32>() as u32;

        let status = unsafe {
            AudioObjectSetPropertyData(
                self.device_id,
                NonNull::new(&address as *const _ as *mut _).unwrap(),
                0,
                std::ptr::null(),
                size,
                NonNull::new(&value as *const _ as *mut c_void).unwrap(),
            )
        };

        if status != 0 {
            return Err(AudioControlError::SetPropertyFailed(format!(
                "OSStatus: {}",
                status
            )));
        }

        Ok(())
    }
}

impl SystemAudioControl for MacOSAudioController {
    fn get_volume(&self) -> Result<f32, AudioControlError> {
        self.get_float_property(kAudioDevicePropertyVolumeScalar)
    }

    fn set_volume(&self, level: f32) -> Result<(), AudioControlError> {
        let level = level.clamp(0.0, 1.0);
        self.set_float_property(kAudioDevicePropertyVolumeScalar, level)
    }

    fn is_muted(&self) -> Result<bool, AudioControlError> {
        self.get_u32_property(kAudioDevicePropertyMute)
            .map(|v| v != 0)
    }

    fn set_muted(&self, muted: bool) -> Result<(), AudioControlError> {
        self.set_u32_property(kAudioDevicePropertyMute, if muted { 1 } else { 0 })
    }
}
