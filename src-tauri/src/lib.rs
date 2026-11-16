use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SubsolarPoint {
    pub lat: f64,
    pub lng: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SolarElevation {
    pub altitude_deg: f64,
    pub azimuth_deg: f64,
    pub is_daylight: bool,
    pub shadow_factor: f64,
}

mod commands {
    use super::*;

    // Calculate the Sun's subsolar geographic coordinates in Rust
    #[tauri::command]
    pub fn get_subsolar_coordinates(timestamp_ms: i64) -> SubsolarPoint {
        let days_since_j2000 = (timestamp_ms as f64 - 946728000000.0) / 86400000.0;
        
        // Mean solar anomaly & ecliptic longitude
        let m = (357.5291 + 0.98560028 * days_since_j2000).to_radians();
        let c = (1.9148 * m.sin()) + (0.0200 * (2.0 * m).sin()) + (0.0003 * (3.0 * m).sin());
        let lambda = (280.4665 + 0.98564736 * days_since_j2000 + c).to_radians();
        
        // Earth's axial tilt (obliquity) ~23.439 degrees
        let epsilon = (23.439 - 0.00000036 * days_since_j2000).to_radians();
        
        let declination_rad = (epsilon.sin() * lambda.sin()).asin();
        let lat = declination_rad.to_degrees();
        
        // Greenwich Hour Angle (GHA) for longitude calculation
        let gmt_fraction = ((timestamp_ms % 86400000) as f64) / 86400000.0;
        let mut lng = -((gmt_fraction * 360.0) - 180.0);
        if lng > 180.0 {
            lng -= 360.0;
        } else if lng < -180.0 {
            lng += 360.0;
        }

        SubsolarPoint { lat, lng }
    }

    // High-speed solar elevation and shadow calculation in Rust
    #[tauri::command]
    pub fn calculate_solar_elevation(lat: f64, lng: f64, timestamp_ms: i64) -> SolarElevation {
        let subsolar = get_subsolar_coordinates(timestamp_ms);
        let phi = lat.to_radians();
        let delta = subsolar.lat.to_radians();
        let h = (lng - subsolar.lng).to_radians();
        
        let sin_altitude = phi.sin() * delta.sin() + phi.cos() * delta.cos() * h.cos();
        let altitude_rad = sin_altitude.asin();
        let altitude_deg = altitude_rad.to_degrees();
        
        let is_daylight = altitude_deg > -0.833;
        let shadow_factor = if altitude_deg <= 0.0 {
            0.0
        } else {
            (1.0 / (altitude_rad.tan() + 0.001)).min(10.0)
        };

        let y = -h.sin();
        let x = phi.cos() * delta.tan() - phi.sin() * h.cos();
        let mut azimuth_deg = y.atan2(x).to_degrees();
        if azimuth_deg < 0.0 {
            azimuth_deg += 360.0;
        }

        SolarElevation {
            altitude_deg,
            azimuth_deg,
            is_daylight,
            shadow_factor,
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_subsolar_coordinates,
            commands::calculate_solar_elevation
        ])
        .run(tauri::generate_context!())
        .expect("error while running TimeOrbit tauri application");
}
