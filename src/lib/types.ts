export type CopingMechanism =
  | 'puzzle'
  | 'smash'
  | 'breathe'
  | 'journal'
  | 'talk';

export type Message = {
  id: string;
  role: 'user' | 'model';
  type?: 'choices' | 'activity' | 'safety-net';
  content: string | React.ReactNode;
};
