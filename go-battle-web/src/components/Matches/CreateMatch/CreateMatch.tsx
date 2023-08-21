import React, { FC } from 'react';
import styles from './CreateMatch.module.css';

interface CreateMatchProps {}

const CreateMatch: FC<CreateMatchProps> = () => (
  <div className={styles.CreateMatch} data-testid="CreateMatch">
    CreateMatch Component
  </div>
);

export default CreateMatch;
