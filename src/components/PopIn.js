import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export default function PopIn({ visible, style, children, ...props }) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.85);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 90 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ scale }] }]} {...props}>
      {children}
    </Animated.View>
  );
}
