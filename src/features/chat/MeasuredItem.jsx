import React, { useLayoutEffect, useRef } from 'react';

const MeasuredItem = ({ index, setSize, style, children }) => {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (ref.current) {
      const height = ref.current.getBoundingClientRect().height;
      setSize(index, height);
    }
  }, [index, setSize, children]);

  return (
    <div ref={ref} style={{ ...style, width: '100%' }}>
      {children}
    </div>
  );
};

export default MeasuredItem;
