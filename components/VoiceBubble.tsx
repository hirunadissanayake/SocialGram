import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import Icon from 'react-native-vector-icons/Ionicons';

type Props = {
  uri: string;
  isMine: boolean;
};

const formatSeconds = (millis?: number) => {
  if (!millis || Number.isNaN(millis)) {
    return '0:00';
  }
  const totalSeconds = Math.max(0, Math.floor(millis / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const VoiceBubble: React.FC<Props> = ({ uri, isMine }) => {
  const player = useMemo(() => new AudioRecorderPlayer(), []);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      player.stopPlayer().catch(() => undefined);
      player.removePlayBackListener();
    };
  }, [player]);

  useEffect(() => {
    setPlaying(false);
    setPosition(0);
    setDuration(null);
  }, [uri]);

  const togglePlayback = async () => {
    if (!uri) {
      return;
    }

    if (playing) {
      try {
        await player.stopPlayer();
      } catch (error) {
        console.warn('Unable to stop playback', error);
      }
      player.removePlayBackListener();
      setPlaying(false);
      return;
    }

    try {
      setLoading(true);
      await player.startPlayer(uri);
      setPlaying(true);
      player.addPlayBackListener((e) => {
        if (Number.isFinite(e.currentPosition)) {
          setPosition(e.currentPosition);
        }
        if (Number.isFinite(e.duration)) {
          setDuration(e.duration);
        }
        if (e.currentPosition >= e.duration && e.duration > 0) {
          player.stopPlayer().catch(() => undefined);
          player.removePlayBackListener();
          setPlaying(false);
          setPosition(0);
        }
        return undefined;
      });
    } catch (error) {
      console.error('Unable to play audio', error);
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, isMine ? styles.containerMine : styles.containerFriend]}
      onPress={togglePlayback}
      activeOpacity={0.8}
    >
      <View style={[styles.iconWrapper, isMine ? styles.iconMine : styles.iconFriend]}>
        {loading ? (
          <ActivityIndicator color={isMine ? '#0f1419' : '#2dd4bf'} size="small" />
        ) : (
          <Icon name={playing ? 'pause' : 'play'} size={18} color={isMine ? '#0f1419' : '#2dd4bf'} />
        )}
      </View>
      <View style={styles.wave}>
        <View style={styles.waveBar} />
        <View style={[styles.waveBar, styles.waveBarTall]} />
        <View style={styles.waveBar} />
        <View style={[styles.waveBar, styles.waveBarTall]} />
      </View>
      <Text style={[styles.timer, isMine ? styles.timerMine : styles.timerFriend]}>{formatSeconds(duration ?? position)}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  containerMine: {
    backgroundColor: '#2dd4bf',
  },
  containerFriend: {
    backgroundColor: '#151f28',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f1419',
  },
  iconMine: {
    backgroundColor: 'rgba(3, 20, 24, 0.15)',
  },
  iconFriend: {
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
  },
  wave: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  waveBar: {
    width: 3,
    borderRadius: 3,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  waveBarTall: {
    height: 20,
  },
  timer: {
    fontWeight: '600',
  },
  timerMine: {
    color: '#0f1419',
  },
  timerFriend: {
    color: '#d8e3f0',
  },
});

export default VoiceBubble;
