import { Skeleton } from '../../components/Skeleton';

export default {
  title: 'Components/Skeleton',
  component: Skeleton,
};

export const Variants = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-6 ig-p-4 ig-max-w-md">
      <div>
        <p className="ig-text-sm ig-mb-2 ig-text-muted">Text</p>
        <Skeleton variant="text" />
      </div>
      <div>
        <p className="ig-text-sm ig-mb-2 ig-text-muted">Title</p>
        <Skeleton variant="title" />
      </div>
      <div>
        <p className="ig-text-sm ig-mb-2 ig-text-muted">Avatar</p>
        <Skeleton variant="avatar" />
      </div>
      <div>
        <p className="ig-text-sm ig-mb-2 ig-text-muted">Avatar Large</p>
        <Skeleton variant="avatar-lg" />
      </div>
      <div>
        <p className="ig-text-sm ig-mb-2 ig-text-muted">Button</p>
        <Skeleton variant="button" />
      </div>
      <div>
        <p className="ig-text-sm ig-mb-2 ig-text-muted">Image</p>
        <Skeleton variant="image" />
      </div>
      <div>
        <p className="ig-text-sm ig-mb-2 ig-text-muted">Card</p>
        <Skeleton variant="card" />
      </div>
    </div>
  ),
};

export const TextLines = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-2 ig-p-4 ig-max-w-md">
      <Skeleton variant="text" />
      <Skeleton variant="text" style={{ width: '90%' }} />
      <Skeleton variant="text" style={{ width: '80%' }} />
      <Skeleton variant="text" style={{ width: '95%' }} />
      <Skeleton variant="text" style={{ width: '60%' }} />
    </div>
  ),
};

export const CardSkeleton = {
  render: () => (
    <div className="ig-p-4 ig-max-w-sm">
      <div className="ig-card ig-p-4">
        <Skeleton variant="image" style={{ marginBottom: '1rem' }} />
        <Skeleton variant="title" style={{ marginBottom: '0.5rem' }} />
        <Skeleton variant="text" style={{ marginBottom: '0.25rem' }} />
        <Skeleton variant="text" style={{ width: '80%', marginBottom: '1rem' }} />
        <Skeleton variant="button" />
      </div>
    </div>
  ),
};

export const UserListSkeleton = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4 ig-max-w-md">
      {[1, 2, 3].map(i => (
        <div key={i} className="ig-flex ig-items-center ig-gap-3">
          <Skeleton variant="avatar" />
          <div className="ig-flex-1">
            <Skeleton variant="title" style={{ width: '60%', marginBottom: '0.5rem' }} />
            <Skeleton variant="text" style={{ width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  ),
};

export const TableSkeleton = {
  render: () => (
    <div className="ig-p-4">
      <table className="ig-table" style={{ maxWidth: '600px' }}>
        <thead>
          <tr>
            <th><Skeleton variant="text" style={{ width: '60%' }} /></th>
            <th><Skeleton variant="text" style={{ width: '60%' }} /></th>
            <th><Skeleton variant="text" style={{ width: '60%' }} /></th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4].map(i => (
            <tr key={i}>
              <td><Skeleton variant="text" /></td>
              <td><Skeleton variant="text" /></td>
              <td><Skeleton variant="text" style={{ width: '50%' }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
};
