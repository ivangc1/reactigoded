import { Breadcrumb, BreadcrumbItem } from '../../components/Breadcrumb';

export default {
  title: 'Components/Breadcrumb',
  component: Breadcrumb,
};

export const Basic = {
  render: () => (
    <div className="ig-p-4">
      <Breadcrumb>
        <BreadcrumbItem href="#">Home</BreadcrumbItem>
        <BreadcrumbItem href="#">Products</BreadcrumbItem>
        <BreadcrumbItem href="#">Category</BreadcrumbItem>
        <BreadcrumbItem current>Current Page</BreadcrumbItem>
      </Breadcrumb>
    </div>
  ),
};

export const CustomSeparator = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4">
      <Breadcrumb separator="/">
        <BreadcrumbItem href="#">Home</BreadcrumbItem>
        <BreadcrumbItem href="#">Library</BreadcrumbItem>
        <BreadcrumbItem current>Data</BreadcrumbItem>
      </Breadcrumb>

      <Breadcrumb separator="›">
        <BreadcrumbItem href="#">Home</BreadcrumbItem>
        <BreadcrumbItem href="#">Library</BreadcrumbItem>
        <BreadcrumbItem current>Data</BreadcrumbItem>
      </Breadcrumb>

      <Breadcrumb separator="→">
        <BreadcrumbItem href="#">Home</BreadcrumbItem>
        <BreadcrumbItem href="#">Library</BreadcrumbItem>
        <BreadcrumbItem current>Data</BreadcrumbItem>
      </Breadcrumb>

      <Breadcrumb separator="•">
        <BreadcrumbItem href="#">Home</BreadcrumbItem>
        <BreadcrumbItem href="#">Library</BreadcrumbItem>
        <BreadcrumbItem current>Data</BreadcrumbItem>
      </Breadcrumb>
    </div>
  ),
};

export const LongPath = {
  render: () => (
    <div className="ig-p-4">
      <Breadcrumb>
        <BreadcrumbItem href="#">Home</BreadcrumbItem>
        <BreadcrumbItem href="#">Dashboard</BreadcrumbItem>
        <BreadcrumbItem href="#">Settings</BreadcrumbItem>
        <BreadcrumbItem href="#">Security</BreadcrumbItem>
        <BreadcrumbItem href="#">Two-Factor Auth</BreadcrumbItem>
        <BreadcrumbItem current>Setup</BreadcrumbItem>
      </Breadcrumb>
    </div>
  ),
};
