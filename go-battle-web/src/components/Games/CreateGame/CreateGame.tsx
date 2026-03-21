import React, { FC } from 'react';
import '../../shared/CreateForm.css';

interface CreateGameProps {}

const CreateGame: FC<CreateGameProps> = () => (
    <div className="create-page">
        <h2 className="create-page__title">New game</h2>
        <div className="create-card">
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                Game creation is not yet available.
            </p>
        </div>
    </div>
);

export default CreateGame;
