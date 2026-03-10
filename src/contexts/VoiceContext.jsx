import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';

const VoiceContext = createContext();

export const VoiceProvider = ({ children }) => {
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);

  const pcRef = useRef(null);
  const channelRef = useRef(null);
  const localStreamRef = useRef(null);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    setRemoteStream(null);
    setIsVoiceActive(false);
  }, []);

  const createPeerConnection = useCallback((channel, isInitiator) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.send({
          type: 'broadcast',
          event: 'voice_candidate',
          payload: { candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pcRef.current = pc;
    return pc;
  }, []);

  const initVoice = useCallback(async (channel, isInitiator, autoMute = false) => {
    try {
      cleanup();
      channelRef.current = channel;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Handle initial mute state
      if (autoMute) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
          setIsMuted(true);
        }
      } else {
        setIsMuted(false);
      }

      const pc = createPeerConnection(channel, isInitiator);

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channel.send({
          type: 'broadcast',
          event: 'voice_offer',
          payload: { sdp: offer }
        });
      }

      setIsVoiceActive(true);
      setError(null);
    } catch (err) {
      console.error('Voice init failed:', err);
      setError('Could not access microphone');
    }
  }, [cleanup, createPeerConnection]);

  const handleOffer = useCallback(async (sdp) => {
    if (!pcRef.current || !channelRef.current) return;
    try {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      channelRef.current.send({
        type: 'broadcast',
        event: 'voice_answer',
        payload: { sdp: answer }
      });
    } catch (err) {
      console.error('Error handling voice offer:', err);
    }
  }, []);

  const handleAnswer = useCallback(async (sdp) => {
    if (!pcRef.current) return;
    try {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (err) {
      console.error('Error handling voice answer:', err);
    }
  }, []);

  const handleCandidate = useCallback(async (candidate) => {
    if (!pcRef.current) return;
    try {
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Error adding ICE candidate:', err);
    }
  }, []);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  return (
    <VoiceContext.Provider value={{ 
      isVoiceActive, 
      localStream, 
      remoteStream, 
      isMuted, 
      error,
      initVoice, 
      handleOffer, 
      handleAnswer, 
      handleCandidate, 
      toggleMute,
      cleanup 
    }}>
      {children}
      {remoteStream && (
        <audio 
          autoPlay 
          ref={audio => { if (audio) audio.srcObject = remoteStream; }} 
          style={{ display: 'none' }}
        />
      )}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => useContext(VoiceContext);
