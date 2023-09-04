import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import CreatePlayer from './CreatePlayer';

describe('<CreatePlayer />', () => {
  test('it should mount', () => {
    render(<CreatePlayer />);
    
    const createPlayer = screen.getByTestId('CreatePlayer');

    expect(createPlayer).toBeInTheDocument();
  });
});