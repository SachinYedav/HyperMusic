import React from 'react';
import { requireNativeComponent, type ViewProps } from 'react-native';

export const NativeHyperVideoView = requireNativeComponent<ViewProps>('HyperVideoView');

export const HyperVideoView: React.FC<ViewProps> = (props) => {
  return <NativeHyperVideoView {...props} />;
};
