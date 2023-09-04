import React, { FC } from 'react';
import styles from './CreateTournament.module.css';

interface CreateTournamentProps {}

const CreateTournament: FC<CreateTournamentProps> = () => (
  <div className={styles.CreateTournament} data-testid="CreateTournament">
    CreateTournament Component
  </div>
);

export default CreateTournament;
