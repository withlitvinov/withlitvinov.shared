import { PropsWithChildren } from 'react';

type CardProps = PropsWithChildren;

export const Card = (props: CardProps) => {
  const { children } = props;

  return (
    <div className="card">
      {children}
    </div>
  );
};
