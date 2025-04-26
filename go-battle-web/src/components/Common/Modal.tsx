import { Button, Modal as BootstrapModal } from 'react-bootstrap';
import { COLORS } from '../../utils/colors';
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

const modalHeaderStyles = {
  background: COLORS.dark.primary,
  color: COLORS.dark.text.primary,
  border: "1px solid rgba(0, 0, 0, 0.175)",
};

const modalBodyStyles = {
  background: COLORS.dark.secondary,
  color: COLORS.dark.text.primary,
  border: "1px solid rgba(0, 0, 0, 0.175)",
};

const modalFooterStyles = {
  background: COLORS.dark.primary,
  color: COLORS.dark.text.primary,
  border: "1px solid rgba(0, 0, 0, 0.175)",
};

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
    <BootstrapModal show={show} onHide={onHide} size={size}>
      <BootstrapModal.Header style={modalHeaderStyles} closeButton>
        <BootstrapModal.Title>{title}</BootstrapModal.Title>
      </BootstrapModal.Header>

      <BootstrapModal.Body style={modalBodyStyles}>
        {children}
      </BootstrapModal.Body>

      <BootstrapModal.Footer style={modalFooterStyles}>
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
    </BootstrapModal>
  );
}
