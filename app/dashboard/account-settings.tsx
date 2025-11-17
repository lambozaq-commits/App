'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Download, Upload } from 'lucide-react';

export function AccountSettings({ currentUser }: { currentUser: string | null }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleExportData = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      user: currentUser,
      kanbanBoards: localStorage.getItem('kanbanBoards'),
      kanbanCards: localStorage.getItem('kanbanCards'),
      todoProjects: localStorage.getItem('todoProjects'),
      todoTasks: localStorage.getItem('todoTasks'),
      journalEntries: localStorage.getItem('journalEntries'),
      budgetTables: localStorage.getItem('budgetTables'),
      budgetCategories: localStorage.getItem('budgetCategories'),
      focusSessions: localStorage.getItem('focusSessions'),
      focusHistory: localStorage.getItem('focusHistory'),
      globalTimerState: localStorage.getItem('globalTimerState'),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `productivity-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        
        // Restore all data
        if (importedData.kanbanBoards) localStorage.setItem('kanbanBoards', importedData.kanbanBoards);
        if (importedData.kanbanCards) localStorage.setItem('kanbanCards', importedData.kanbanCards);
        if (importedData.todoProjects) localStorage.setItem('todoProjects', importedData.todoProjects);
        if (importedData.todoTasks) localStorage.setItem('todoTasks', importedData.todoTasks);
        if (importedData.journalEntries) localStorage.setItem('journalEntries', importedData.journalEntries);
        if (importedData.budgetTables) localStorage.setItem('budgetTables', importedData.budgetTables);
        if (importedData.budgetCategories) localStorage.setItem('budgetCategories', importedData.budgetCategories);
        if (importedData.focusSessions) localStorage.setItem('focusSessions', importedData.focusSessions);
        if (importedData.focusHistory) localStorage.setItem('focusHistory', importedData.focusHistory);
        
        alert('Data imported successfully! Please refresh the page to see your restored data.');
        window.location.reload();
      } catch (error) {
        alert('Error importing data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleChangePassword = () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    const users = JSON.parse(localStorage.getItem('appUsers') || '[]');
    const user = users.find((u: any) => u.email === currentUser);

    if (!user) {
      setPasswordError('User not found');
      return;
    }

    if (user.password !== currentPassword) {
      setPasswordError('Current password is incorrect');
      return;
    }

    const updatedUsers = users.map((u: any) =>
      u.email === currentUser ? { ...u, password: newPassword } : u
    );
    localStorage.setItem('appUsers', JSON.stringify(updatedUsers));

    setPasswordSuccess('Password changed successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    setTimeout(() => setPasswordSuccess(''), 3000);
  };

  const handleDeleteAccount = () => {
    const users = JSON.parse(localStorage.getItem('appUsers') || '[]');
    const updatedUsers = users.filter((u: any) => u.email !== currentUser);
    localStorage.setItem('appUsers', JSON.stringify(updatedUsers));
    localStorage.removeItem('currentUser');
    window.location.href = '/';
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Data Backup</h2>
        
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Export your data for backup or transfer to another device. Import previously exported data to restore your information.
          </p>
          
          <div className="flex gap-3">
            <Button
              onClick={handleExportData}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Export All Data
            </Button>
            
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
              <Button
                type="button"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                onClick={(e) => {
                  e.preventDefault();
                  (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                }}
              >
                <Upload className="w-4 h-4" />
                Import Data
              </Button>
            </label>
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Change Password</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {passwordError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 p-3 rounded-lg text-sm">
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-200 p-3 rounded-lg text-sm">
              {passwordSuccess}
            </div>
          )}

          <Button
            onClick={handleChangePassword}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Update Password
          </Button>
        </div>
      </div>

      {/* Delete Account Section */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-red-200 dark:border-red-900 p-6">
        <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-4">Danger Zone</h2>
        
        {!deleteConfirm ? (
          <div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Deleting your account is permanent and cannot be undone. All your data will be lost.
            </p>
            <Button
              onClick={() => setDeleteConfirm(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete My Account
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 p-4 rounded-lg">
              <p className="font-medium mb-2">Are you absolutely sure?</p>
              <p className="text-sm">This action cannot be undone. Your account and all data will be permanently deleted.</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleDeleteAccount}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Yes, Delete My Account
              </Button>
              <Button
                onClick={() => setDeleteConfirm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
