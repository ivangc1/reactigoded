import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input, Label } from '../../components/Input';

export default {
  title: 'Components/Modal',
  component: Modal,
};

export const Basic = {
  render: function BasicModal() {
    const [open, setOpen] = useState(false);
    return (
      <div className="ig-p-4">
        <Button onClick={() => setOpen(true)}>Open Modal</Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Modal Title"
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setOpen(false)}>Confirm</Button>
            </>
          }
        >
          <p>This is the modal content. You can put anything here.</p>
        </Modal>
      </div>
    );
  },
};

export const Sizes = {
  render: function ModalSizes() {
    const [size, setSize] = useState(null);
    return (
      <div className="ig-flex ig-flex-wrap ig-gap-4 ig-p-4">
        <Button onClick={() => setSize('sm')}>Small Modal</Button>
        <Button onClick={() => setSize('md')}>Medium Modal</Button>
        <Button onClick={() => setSize('lg')}>Large Modal</Button>
        <Button onClick={() => setSize('xl')}>XL Modal</Button>

        <Modal
          open={!!size}
          size={size}
          onClose={() => setSize(null)}
          title={`${size?.toUpperCase()} Modal`}
          footer={<Button onClick={() => setSize(null)}>Close</Button>}
        >
          <p>This is a {size} sized modal.</p>
          <p className="ig-mt-2 ig-text-muted">
            The width adjusts based on the size prop.
          </p>
        </Modal>
      </div>
    );
  },
};

export const WithForm = {
  render: function FormModal() {
    const [open, setOpen] = useState(false);
    return (
      <div className="ig-p-4">
        <Button onClick={() => setOpen(true)}>Edit Profile</Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Edit Profile"
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setOpen(false)}>Save Changes</Button>
            </>
          }
        >
          <div className="ig-flex ig-flex-col ig-gap-4">
            <div>
              <Label>Name</Label>
              <Input defaultValue="John Doe" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" defaultValue="john@example.com" />
            </div>
            <div>
              <Label>Bio</Label>
              <textarea className="ig-textarea" defaultValue="Software developer..." />
            </div>
          </div>
        </Modal>
      </div>
    );
  },
};

export const ConfirmDialog = {
  render: function ConfirmModal() {
    const [open, setOpen] = useState(false);
    return (
      <div className="ig-p-4">
        <Button variant="danger" onClick={() => setOpen(true)}>Delete Account</Button>
        <Modal
          open={open}
          size="sm"
          onClose={() => setOpen(false)}
          title="Confirm Deletion"
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={() => setOpen(false)}>Delete</Button>
            </>
          }
        >
          <p>Are you sure you want to delete your account? This action cannot be undone.</p>
        </Modal>
      </div>
    );
  },
};

export const NoFooter = {
  render: function NoFooterModal() {
    const [open, setOpen] = useState(false);
    return (
      <div className="ig-p-4">
        <Button onClick={() => setOpen(true)}>Information Modal</Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Information"
        >
          <p>This modal has no footer. Click outside or use the X button to close.</p>
          <p className="ig-mt-2 ig-text-muted">Perfect for informational dialogs.</p>
        </Modal>
      </div>
    );
  },
};
