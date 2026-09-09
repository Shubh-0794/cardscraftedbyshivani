import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useGoogleDrive } from './GoogleDriveContext';
import {
  GmailMessageSummary,
  SendEmailPayload,
  listGmailMessages,
  getGmailProfile,
  sendGmailEmail
} from '../services/gmail';

interface GmailContextType {
  messages: GmailMessageSummary[];
  loadingMessages: boolean;
  sending: boolean;
  userEmailAddress: string | null;
  refreshMessages: (query?: string) => Promise<void>;
  sendEmail: (payload: SendEmailPayload) => Promise<{ id: string; threadId: string }>;
}

const GmailContext = createContext<GmailContextType | undefined>(undefined);

export const GmailProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isConnected } = useGoogleDrive();
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [userEmailAddress, setUserEmailAddress] = useState<string | null>(null);

  const refreshMessages = async (query: string = '') => {
    if (!isConnected) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    try {
      const [profileData, msgList] = await Promise.allSettled([
        getGmailProfile(),
        listGmailMessages(query)
      ]);

      if (profileData.status === 'fulfilled') {
        setUserEmailAddress(profileData.value.emailAddress);
      }
      if (msgList.status === 'fulfilled') {
        setMessages(msgList.value);
      }
    } catch (err) {
      console.warn('Failed to refresh Gmail:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      refreshMessages();
    } else {
      setMessages([]);
      setUserEmailAddress(null);
    }
  }, [isConnected]);

  const sendEmail = async (payload: SendEmailPayload) => {
    setSending(true);
    try {
      const res = await sendGmailEmail(payload);
      await refreshMessages();
      return res;
    } finally {
      setSending(false);
    }
  };

  return (
    <GmailContext.Provider
      value={{
        messages,
        loadingMessages,
        sending,
        userEmailAddress,
        refreshMessages,
        sendEmail
      }}
    >
      {children}
    </GmailContext.Provider>
  );
};

export const useGmail = () => {
  const context = useContext(GmailContext);
  if (!context) {
    throw new Error('useGmail must be used within a GmailProvider');
  }
  return context;
};
