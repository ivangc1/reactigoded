import { Table } from '../../components/Table';
import { Badge } from '../../components/Badge';

export default {
  title: 'Components/Table',
  component: Table,
};

const sampleData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active', role: 'Admin' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Active', role: 'User' },
  { id: 3, name: 'Bob Wilson', email: 'bob@example.com', status: 'Inactive', role: 'User' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', status: 'Active', role: 'Editor' },
  { id: 5, name: 'Charlie Davis', email: 'charlie@example.com', status: 'Pending', role: 'User' },
];

export const Basic = {
  render: () => (
    <div className="ig-p-4">
      <Table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {sampleData.map(row => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.email}</td>
              <td>
                <Badge variant={row.status === 'Active' ? 'success' : row.status === 'Pending' ? 'warning' : undefined}>
                  {row.status}
                </Badge>
              </td>
              <td>{row.role}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  ),
};

export const Striped = {
  render: () => (
    <div className="ig-p-4">
      <Table striped>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {sampleData.map(row => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.email}</td>
              <td>{row.role}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  ),
};

export const Hover = {
  render: () => (
    <div className="ig-p-4">
      <Table hover>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {sampleData.map(row => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.email}</td>
              <td>{row.role}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  ),
};

export const Bordered = {
  render: () => (
    <div className="ig-p-4">
      <Table bordered>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {sampleData.map(row => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.email}</td>
              <td>{row.role}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  ),
};

export const Compact = {
  render: () => (
    <div className="ig-p-4">
      <Table compact striped>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {sampleData.map(row => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.name}</td>
              <td>{row.email}</td>
              <td>{row.status}</td>
              <td>{row.role}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  ),
};

export const AllVariants = {
  render: () => (
    <div className="ig-p-4">
      <Table striped hover bordered>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {sampleData.map(row => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.email}</td>
              <td>
                <Badge variant={row.status === 'Active' ? 'success' : row.status === 'Pending' ? 'warning' : undefined}>
                  {row.status}
                </Badge>
              </td>
              <td>{row.role}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  ),
};
