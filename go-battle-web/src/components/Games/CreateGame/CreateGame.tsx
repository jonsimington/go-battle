import React, { FC } from 'react';
import styles from './CreateGame.module.css';

interface CreateGameProps {}

const CreateGame: FC<CreateGameProps> = () => (
  <div className={styles.CreateGame} data-testid="CreateGame">
    CreateGame Component
  </div>
);

export default CreateGame;
