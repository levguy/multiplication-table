#!/usr/bin/env python3
"""
Regenerate sounds.json manifest from available MP3 files.
Automatically normalizes volume levels for new sound files.

Usage: python update-sounds.py
"""

import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Set

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

# Volume range based on top 1 and top 5 files from the success folder
# Top 1 (loudest): -12.4 dB, Top 5: -19.8 dB
VOLUME_RANGE_HIGH = -12.4  # dB (loudest acceptable)
VOLUME_RANGE_LOW = -19.8   # dB (quietest acceptable)
TARGET_VOLUME = (VOLUME_RANGE_HIGH + VOLUME_RANGE_LOW) / 2  # -16.1 dB

SOUND_DIRS = {
    "correct": "sounds/success",
    "wrong": "sounds/fail",
}

SOUNDS_JSON = "sounds.json"
NORMALIZED_SUFFIX = "_normalized"  # Suffix added to files after volume adjustment


def get_mean_volume(file_path: str) -> Optional[float]:
    """Get mean volume in dB using ffmpeg volumedetect."""
    try:
        result = subprocess.run(
            [
                "ffmpeg",
                "-i", file_path,
                "-af", "volumedetect",
                "-f", "null",
                "/dev/null",
            ],
            capture_output=True,
            text=True,
        )
        # Mean volume is in stderr
        match = re.search(r"mean_volume:\s*([-\d.]+)\s*dB", result.stderr)
        if match:
            return float(match.group(1))
    except Exception as e:
        logger.error(f"Error getting volume for {file_path}: {e}")
    return None


def adjust_volume(file_path: str, adjustment_db: float, backup_dir: str) -> Optional[str]:
    """Adjust volume of an audio file by the specified dB amount.
    
    Returns the new file path (with suffix) on success, None on failure.
    """
    path = Path(file_path)
    backup_path = Path(backup_dir) / path.name
    
    # Create backup
    shutil.copy2(file_path, backup_path)
    logger.info(f"  Backup created: {backup_path}")
    
    # Create temp file for output
    temp_fd, temp_path = tempfile.mkstemp(suffix=".mp3")
    os.close(temp_fd)
    
    try:
        # Apply volume adjustment
        result = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i", file_path,
                "-af", f"volume={adjustment_db}dB",
                "-c:a", "libmp3lame",
                "-q:a", "2",  # High quality
                temp_path,
            ],
            capture_output=True,
            text=True,
        )
        
        if result.returncode != 0:
            logger.error(f"  FFmpeg error: {result.stderr}")
            return None
        
        # Create new filename with suffix
        new_name = f"{path.stem}{NORMALIZED_SUFFIX}{path.suffix}"
        new_path = path.parent / new_name
        
        # Move adjusted file to new path
        shutil.move(temp_path, new_path)
        
        # Remove original file
        os.remove(file_path)
        
        logger.info(f"  Renamed to: {new_path}")
        return str(new_path)
    except Exception as e:
        logger.error(f"  Error adjusting volume: {e}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return None


def normalize_file_if_needed(file_path: str, backup_dir: str) -> Optional[str]:
    """Check and normalize volume if outside acceptable range.
    
    Returns the new file path if normalized, None otherwise.
    """
    mean_vol = get_mean_volume(file_path)
    if mean_vol is None:
        logger.warning(f"  Could not detect volume, skipping normalization")
        return None
    
    logger.info(f"  Current mean volume: {mean_vol:.1f} dB")
    
    if VOLUME_RANGE_LOW <= mean_vol <= VOLUME_RANGE_HIGH:
        logger.info(f"  Volume is within acceptable range ({VOLUME_RANGE_LOW} to {VOLUME_RANGE_HIGH} dB)")
        return None
    
    # Calculate adjustment needed to reach target volume
    adjustment = TARGET_VOLUME - mean_vol
    direction = "Boosting" if adjustment > 0 else "Reducing"
    logger.info(f"  {direction} volume by {abs(adjustment):.1f} dB to reach target {TARGET_VOLUME:.1f} dB")
    
    new_path = adjust_volume(file_path, adjustment, backup_dir)
    if new_path:
        # Verify the new volume
        new_vol = get_mean_volume(new_path)
        if new_vol is not None:
            logger.info(f"  New mean volume: {new_vol:.1f} dB")
        return new_path
    return None


def load_existing_sounds() -> Set[str]:
    """Load existing sound file paths from sounds.json."""
    if not os.path.exists(SOUNDS_JSON):
        return set()
    
    try:
        with open(SOUNDS_JSON) as f:
            data = json.load(f)
        
        existing = set()
        for key in SOUND_DIRS:
            if key in data:
                existing.update(data[key])
        return existing
    except Exception as e:
        logger.warning(f"Could not read {SOUNDS_JSON}: {e}")
        return set()


def get_current_files() -> Dict[str, List[str]]:
    """Get current MP3 files from sound directories."""
    result = {}
    for key, directory in SOUND_DIRS.items():
        files = sorted(Path(directory).glob("*.mp3"), key=lambda p: p.name.lower())
        result[key] = [str(f) for f in files]
    return result


def generate_sounds_json(sounds: Dict[str, List[str]]) -> None:
    """Generate the sounds.json manifest file."""
    with open(SOUNDS_JSON, "w") as f:
        json.dump(sounds, f, indent=2)
        f.write("\n")


def main() -> None:
    # Change to script directory
    os.chdir(Path(__file__).parent)
    
    # Load existing sounds to detect new files
    existing_sounds = load_existing_sounds()
    logger.info(f"Found {len(existing_sounds)} existing sounds in {SOUNDS_JSON}")
    
    # Get current files
    current_sounds = get_current_files()
    all_current = set()
    for files in current_sounds.values():
        all_current.update(files)
    
    # Find new files
    new_files = all_current - existing_sounds
    
    if new_files:
        logger.info(f"\nFound {len(new_files)} new sound file(s):")
        
        # Create backup directory
        backup_dir = tempfile.mkdtemp(prefix="sound_backup_")
        logger.info(f"\nBackup directory: {backup_dir}")
        
        normalized_count = 0
        for file_path in sorted(new_files):
            logger.info(f"\nProcessing: {file_path}")
            new_path = normalize_file_if_needed(file_path, backup_dir)
            if new_path:
                normalized_count += 1
        
        if normalized_count > 0:
            logger.info(f"\n📢 Normalized {normalized_count} file(s)")
            logger.info(f"📁 Backups saved to: {backup_dir}")
            # Refresh file list since some files were renamed
            current_sounds = get_current_files()
        else:
            # Clean up empty backup dir
            os.rmdir(backup_dir)
            logger.info("\nNo files needed normalization")
    else:
        logger.info("No new sound files detected")
    
    # Generate sounds.json
    generate_sounds_json(current_sounds)
    
    # Report
    correct_count = len(current_sounds.get("correct", []))
    wrong_count = len(current_sounds.get("wrong", []))
    
    logger.info(f"\n✅ Updated {SOUNDS_JSON}")
    logger.info(f"   - Success sounds: {correct_count}")
    logger.info(f"   - Fail sounds: {wrong_count}")


if __name__ == "__main__":
    main()
