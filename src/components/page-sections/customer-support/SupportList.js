import React from 'react';
import SupportItem from './SupportItem';
import { useTransition, animated } from 'react-spring';

const AnimatedDiv = animated.div;

const SupportList = ({ supports, onUpdate }) => {
  const transitions = useTransition(supports, {
    keys: (item) => item._id,
    from: { opacity: 0, transform: 'translate3d(0,20px,0)' },
    enter: { opacity: 1, transform: 'translate3d(0,0px,0)' },
    leave: { opacity: 0, transform: 'translate3d(0,-20px,0)' },
    config: { tension: 220, friction: 20 },
    reset: true,
  });

  return (
    <>
      {transitions((style, item) => (
        <AnimatedDiv key={item._id} style={style}>
          <SupportItem support={item} onUpdate={onUpdate} />
        </AnimatedDiv>
      ))}
    </>
  );
};

export default SupportList;
