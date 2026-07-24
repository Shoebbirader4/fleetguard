import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Camera, CameraType } from 'expo-camera';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';

type RootStackParamList = {
  MediaCapture: { workOrderId: string; mediaType: 'photo' | 'video' | 'voice' };
  WorkOrderDetail: { workOrderId: string };
};

type ScreenRouteProp = RouteProp<RootStackParamList, 'MediaCapture'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'MediaCapture'>;

export default function MediaCaptureScreen() {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { workOrderId, mediaType } = route.params;

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [capturedMedia, setCapturedMedia] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const cameraRef = useRef<Camera>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  React.useEffect(() => {
    (async () => {
      if (mediaType === 'photo' || mediaType === 'video') {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } else if (mediaType === 'voice') {
        const { status } = await Audio.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      }
    })();
  }, [mediaType]);

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      setCapturedMedia(photo.uri);
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === 'photo' 
          ? ImagePicker.MediaTypeOptions.Images 
          : ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedMedia(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Failed to pick from gallery:', error);
      Alert.alert('Error', 'Failed to pick media from gallery');
    }
  };

  const handleStartRecording = async () => {
    if (mediaType === 'voice') {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();
        
        recordingRef.current = recording;
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
        Alert.alert('Error', 'Failed to start voice recording');
      }
    } else if (mediaType === 'video' && cameraRef.current) {
      try {
        const video = await cameraRef.current.recordAsync({
          maxDuration: 60, // 1 minute max
        });
        setCapturedMedia(video.uri);
      } catch (error) {
        console.error('Failed to record video:', error);
        Alert.alert('Error', 'Failed to record video');
      }
    }
  };

  const handleStopRecording = async () => {
    if (mediaType === 'voice' && recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        setCapturedMedia(uri || null);
        recordingRef.current = null;
        setIsRecording(false);
      } catch (error) {
        console.error('Failed to stop recording:', error);
        Alert.alert('Error', 'Failed to stop voice recording');
      }
    } else if (mediaType === 'video' && cameraRef.current) {
      try {
        cameraRef.current.stopRecording();
        setIsRecording(false);
      } catch (error) {
        console.error('Failed to stop video recording:', error);
      }
    }
  };

  const uploadToSupabase = async (uri: string): Promise<string | null> => {
    try {
      // Create a unique filename
      const fileExt = uri.split('.').pop();
      const fileName = `${workOrderId}_${Date.now()}.${fileExt}`;
      const filePath = `work-orders/${workOrderId}/${fileName}`;

      // Upload file to Supabase Storage
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('maintenance-media')
        .upload(filePath, blob, {
          contentType: mediaType === 'photo' ? 'image/jpeg' : 
                      mediaType === 'video' ? 'video/mp4' : 
                      'audio/m4a',
        });

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('maintenance-media')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload failed:', error);
      return null;
    }
  };

  const processWithAI = async (fileUrl: string): Promise<string | null> => {
    try {
      // Call AI Assistant Edge Function
      const { data, error } = await supabase.functions.invoke('ai-assistant-handler', {
        body: {
          file_url: fileUrl,
          type: mediaType,
          work_order_id: workOrderId,
        },
      });

      if (error) {
        console.error('AI processing error:', error);
        return null;
      }

      // Format AI result
      if (data) {
        const result = `
Component: ${data.component_type || 'N/A'}
Issue: ${data.damage_type || 'N/A'}
Severity: ${data.severity || 'N/A'}
Description: ${data.description || 'N/A'}
        `.trim();
        return result;
      }

      return null;
    } catch (error) {
      console.error('AI processing failed:', error);
      return null;
    }
  };

  const handleSave = async () => {
    if (!capturedMedia) return;

    setIsUploading(true);
    setAiProcessing(true);

    try {
      // Upload to Supabase
      const fileUrl = await uploadToSupabase(capturedMedia);
      
      if (!fileUrl) {
        Alert.alert('Error', 'Failed to upload media');
        return;
      }

      // Process with AI (optional - may not be configured)
      const aiAnalysis = await processWithAI(fileUrl);
      
      if (aiAnalysis) {
        setAiResult(aiAnalysis);
        setAiProcessing(false);
        
        Alert.alert(
          'AI Analysis Complete',
          'The AI has analyzed your media. Review the results below.',
          [
            {
              text: 'Save & Continue',
              onPress: () => {
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        // If AI processing is not available or failed, just save the upload
        Alert.alert(
          'Success',
          'Media uploaded successfully',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Save failed:', error);
      Alert.alert('Error', 'Failed to save media');
    } finally {
      setIsUploading(false);
      setAiProcessing(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Requesting permissions...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No access to {mediaType === 'voice' ? 'microphone' : 'camera'}</Text>
        <Text style={styles.errorSubtext}>Please enable permissions in settings</Text>
      </View>
    );
  }

  if (capturedMedia) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Review {mediaType === 'photo' ? 'Photo' : mediaType === 'video' ? 'Video' : 'Voice Note'}</Text>

          {mediaType === 'photo' && (
            <Image source={{ uri: capturedMedia }} style={styles.preview} />
          )}

          {mediaType === 'voice' && (
            <View style={styles.voicePreview}>
              <Text style={styles.voiceText}>🎙️</Text>
              <Text style={styles.voiceLabel}>Voice recording ready</Text>
            </View>
          )}

          {mediaType === 'video' && (
            <View style={styles.videoPreview}>
              <Text style={styles.videoText}>🎥</Text>
              <Text style={styles.videoLabel}>Video recording ready</Text>
            </View>
          )}

          {aiProcessing && (
            <View style={styles.aiCard}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.aiProcessingText}>AI is analyzing your {mediaType}...</Text>
            </View>
          )}

          {aiResult && (
            <View style={styles.aiCard}>
              <Text style={styles.aiTitle}>AI Analysis Results</Text>
              <Text style={styles.aiResult}>{aiResult}</Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.retakeButton]}
              onPress={() => setCapturedMedia(null)}
              disabled={isUploading}
            >
              <Text style={styles.buttonText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton, isUploading && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonTextWhite}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  if (mediaType === 'photo' || mediaType === 'video') {
    return (
      <View style={styles.container}>
        <Camera
          style={styles.camera}
          type={CameraType.back}
          ref={cameraRef}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={mediaType === 'photo' ? handleTakePhoto : handleStartRecording}
              >
                <Text style={styles.captureIcon}>
                  {mediaType === 'photo' ? '📸' : '🎥'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.galleryButton}
                onPress={handlePickFromGallery}
              >
                <Text style={styles.galleryText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Camera>
      </View>
    );
  }

  // Voice recording UI
  return (
    <View style={styles.container}>
      <View style={styles.voiceContainer}>
        <Text style={styles.title}>Record Voice Note</Text>
        
        <View style={styles.recordingCard}>
          <Text style={styles.micIcon}>🎙️</Text>
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording...</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          onPress={isRecording ? handleStopRecording : handleStartRecording}
        >
          <Text style={styles.recordButtonText}>
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureIcon: {
    fontSize: 32,
  },
  galleryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  galleryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  preview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
  },
  voiceContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 16,
    justifyContent: 'center',
  },
  recordingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 48,
    alignItems: 'center',
    marginBottom: 32,
  },
  micIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  recordButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  recordButtonActive: {
    backgroundColor: '#ef4444',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  voicePreview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    marginBottom: 16,
  },
  voiceText: {
    fontSize: 64,
    marginBottom: 16,
  },
  voiceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  videoPreview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    marginBottom: 16,
  },
  videoText: {
    fontSize: 64,
    marginBottom: 16,
  },
  videoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  aiCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  aiProcessingText: {
    fontSize: 14,
    color: '#1e40af',
    marginLeft: 8,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: 8,
  },
  aiResult: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  retakeButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  saveButton: {
    backgroundColor: '#2563eb',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextWhite: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
