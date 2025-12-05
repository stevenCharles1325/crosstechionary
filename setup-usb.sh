#!/bin/bash

echo "🔌 Setting up USB connection for Expo..."
echo ""

# Check if device is connected
echo "1. Checking for connected devices..."
adb devices
echo ""

# Check if any device is connected
DEVICE_COUNT=$(adb devices | grep -w "device" | wc -l)

if [ "$DEVICE_COUNT" -eq 0 ]; then
    echo "❌ No devices found!"
    echo ""
    echo "Please:"
    echo "  1. Connect your Android phone via USB"
    echo "  2. Enable USB debugging in Developer Options"
    echo "  3. Accept the USB debugging prompt on your phone"
    echo "  4. Run this script again"
    exit 1
fi

echo "✅ Device connected!"
echo ""

# Set up port forwarding
echo "2. Setting up ADB reverse port forwarding..."
adb reverse tcp:8081 tcp:8081
adb reverse tcp:19000 tcp:19000
adb reverse tcp:19001 tcp:19001

if [ $? -eq 0 ]; then
    echo "✅ Port forwarding configured!"
    echo ""
    echo "📱 Now you can:"
    echo "  - Open Expo Go on your phone"
    echo "  - Enter URL manually: exp://localhost:19000"
    echo "  - Or press 'a' in your Expo terminal to auto-open"
else
    echo "❌ Port forwarding failed. Make sure USB debugging is enabled."
    exit 1
fi
