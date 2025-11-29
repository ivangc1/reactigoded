import { Navbar, NavbarBrand, NavbarNav, NavbarLink, NavbarActions } from '../../components/Navbar';
import { Button } from '../../components/Button';

export default {
  title: 'Components/Navbar',
  component: Navbar,
};

export const Basic = {
  render: () => (
    <Navbar>
      <NavbarBrand>
        <span style={{ fontSize: '1.5rem' }}>&#9733;</span>
        <span>Brand</span>
      </NavbarBrand>
      <NavbarNav>
        <NavbarLink href="#" active>Home</NavbarLink>
        <NavbarLink href="#">Products</NavbarLink>
        <NavbarLink href="#">Pricing</NavbarLink>
        <NavbarLink href="#">About</NavbarLink>
      </NavbarNav>
      <NavbarActions>
        <Button variant="ghost" size="sm">Log in</Button>
        <Button variant="primary" size="sm">Sign up</Button>
      </NavbarActions>
    </Navbar>
  ),
};

export const Sticky = {
  render: () => (
    <div>
      <Navbar sticky>
        <NavbarBrand>
          <span style={{ fontSize: '1.5rem' }}>&#9733;</span>
          <span>Sticky Nav</span>
        </NavbarBrand>
        <NavbarNav>
          <NavbarLink href="#" active>Home</NavbarLink>
          <NavbarLink href="#">About</NavbarLink>
          <NavbarLink href="#">Contact</NavbarLink>
        </NavbarNav>
        <NavbarActions>
          <Button variant="primary" size="sm">Get Started</Button>
        </NavbarActions>
      </Navbar>
      <div className="ig-p-4">
        <p className="ig-text-muted ig-mb-4">Scroll down to see the sticky behavior.</p>
        {Array.from({ length: 10 }, (_, i) => (
          <p key={i} className="ig-mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua.
          </p>
        ))}
      </div>
    </div>
  ),
};

export const Glass = {
  render: () => (
    <div style={{
      background: 'linear-gradient(135deg, var(--ig-tellus), var(--ig-vesper))',
      minHeight: '300px',
      padding: '1rem'
    }}>
      <Navbar glass>
        <NavbarBrand>
          <span style={{ fontSize: '1.5rem' }}>&#9733;</span>
          <span>Glass Nav</span>
        </NavbarBrand>
        <NavbarNav>
          <NavbarLink href="#" active>Home</NavbarLink>
          <NavbarLink href="#">Features</NavbarLink>
          <NavbarLink href="#">Pricing</NavbarLink>
        </NavbarNav>
        <NavbarActions>
          <Button variant="ghost" size="sm">Login</Button>
          <Button size="sm">Sign up</Button>
        </NavbarActions>
      </Navbar>
    </div>
  ),
};

export const Minimal = {
  render: () => (
    <Navbar>
      <NavbarBrand href="#">
        <span style={{ fontSize: '1.5rem' }}>&#9733;</span>
        <span>Logo</span>
      </NavbarBrand>
      <NavbarActions>
        <Button icon variant="ghost">&#128269;</Button>
        <Button icon variant="ghost">&#128276;</Button>
        <Button icon variant="ghost">&#128100;</Button>
      </NavbarActions>
    </Navbar>
  ),
};

export const WithDropdown = {
  render: () => (
    <Navbar>
      <NavbarBrand>
        <span style={{ fontSize: '1.5rem' }}>&#9733;</span>
        <span>Company</span>
      </NavbarBrand>
      <NavbarNav>
        <NavbarLink href="#" active>Home</NavbarLink>
        <div className="ig-dropdown">
          <button className="ig-navbar-link ig-dropdown-trigger">
            Products &#9662;
          </button>
          <div className="ig-dropdown-menu">
            <a className="ig-dropdown-item" href="#">Product A</a>
            <a className="ig-dropdown-item" href="#">Product B</a>
            <a className="ig-dropdown-item" href="#">Product C</a>
          </div>
        </div>
        <NavbarLink href="#">Pricing</NavbarLink>
        <NavbarLink href="#">Contact</NavbarLink>
      </NavbarNav>
      <NavbarActions>
        <Button variant="primary" size="sm">Get Started</Button>
      </NavbarActions>
    </Navbar>
  ),
};
