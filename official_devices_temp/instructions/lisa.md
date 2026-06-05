## Flashing Steps

### Clean Flash
- Reboot to bootloader (fastboot)
- Connect your phone to PC
- fastboot flash boot boot.img
- fastboot flash vendor_boot vendor_boot.img
- fastboot flash dtbo dtbo.img
- fastboot reboot recovery
- Select Wipe data/factory reset & confirm
- Go back and select Apply update from ADB
- adb sideload Rom*.zip(or drag down the rom zip to cmd)
- After installation complete, Reboot system.

### Dirty Flash
- Reboot to recovery by holding power button and volume up simultaneously
- In the recovery menu select Apply update through ADB
- adb sideload Rom*.zip(or drag down the rom zip to cmd)
- After installation complete, Reboot system.
