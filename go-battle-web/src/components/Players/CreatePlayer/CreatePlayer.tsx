import React, { FC } from 'react';
import styles from './CreatePlayer.module.css';

interface CreatePlayerProps {}

const CreatePlayer: FC<CreatePlayerProps> = () => (
  <div className={styles.CreatePlayer} data-testid="CreatePlayer">
    CreatePlayer Component
  </div>
);

export default CreatePlayer;
