import { Button, Modal as BootstrapModal } from 'react-bootstrap';
import { ReactNode } from 'react';

export interface ModalButton {
  variant: string;
  text: string;
  onClick: () => void;
}

export interface ModalProps {
  show: boolean;
  title: string;
  onHide: () => void;
  children: ReactNode;
  primaryButton?: ModalButton;
  secondaryButton?: ModalButton;
  size?: 'sm' | 'lg' | 'xl';
}

export function Modal({
  show,
  title,
  onHide,
  children,
  primaryButton,
  secondaryButton,
  size
}: ModalProps): JSX.Element {
  return (
    <BootstrapModal show={show} onHide={onHide} size={size} centered>
      <BootstrapModal.Header closeButton closeVariant="white">
        <BootstrapModal.Title>{title}</BootstrapModal.Title>
      </BootstrapModal.Header>

      <BootstrapModal.Body>
        {children}
      </BootstrapModal.Body>

      {(primaryButton || secondaryButton) && (
        <BootstrapModal.Footer>
          {secondaryButton && (
            <Button
              variant={secondaryButton.variant}
              onClick={secondaryButton.onClick}
            >
              {secondaryButton.text}
            </Button>
          )}
          {primaryButton && (
            <Button
              variant={primaryButton.variant}
              onClick={primaryButton.onClick}
            >
              {primaryButton.text}
            </Button>
          )}
        </BootstrapModal.Footer>
      )}
    </BootstrapModal>
  );
}
