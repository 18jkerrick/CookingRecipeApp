import { useState, useEffect } from 'react';

interface PushNotificationPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PushNotificationPrompt({ isOpen, onClose }: PushNotificationPromptProps) {
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const requestPermission = async () => {
    setIsRequestingPermission(true);
    
    try {
      const permission = await Notification.requestPermission();
      localStorage.setItem('notificationPermissionRequested', 'true');
      localStorage.setItem('notificationPermission', permission);
      console.log('Notification permission:', permission);
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsRequestingPermission(false);
      onClose();
    }
  };

  const declinePermission = () => {
    localStorage.setItem('notificationPermissionRequested', 'true');
    localStorage.setItem('notificationPermission', 'denied');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
        <div className="text-center">
          <div className="text-4xl mb-4">🔔</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Stay Updated!</h2>
          <p className="text-gray-800 mb-6 font-medium">
            Get notified when your recipes are ready and discover new cooking tips from Remy.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={requestPermission}
              disabled={isRequestingPermission}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {isRequestingPermission ? 'Requesting...' : 'Allow Notifications'}
            </button>
            
            <button
              onClick={declinePermission}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 