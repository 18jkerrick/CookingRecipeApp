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
      <div className="bg-[#1e1f26] rounded-lg p-6 max-w-sm w-full shadow-xl border border-white/10">
        <div className="text-center">
          <div className="text-4xl mb-4">🔔</div>
          <h2 className="text-xl font-bold text-white mb-2">Stay Updated!</h2>
          <p className="text-white/80 mb-6 font-medium">
            Get notified when your recipes are ready and discover new cooking tips from Remy.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={requestPermission}
              disabled={isRequestingPermission}
              className="w-full bg-[#FF3A25] hover:bg-[#FF3A25]/90 disabled:bg-[#FF3A25]/50 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {isRequestingPermission ? 'Requesting...' : 'Allow Notifications'}
            </button>
            
            <button
              onClick={declinePermission}
              className="w-full bg-white/10 hover:bg-white/20 text-white/80 font-medium py-3 px-4 rounded-lg transition-colors border border-white/20"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}