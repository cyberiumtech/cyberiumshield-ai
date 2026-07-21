import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * @deprecated This component is deprecated in favor of using idiomatic
 * `react-router-dom` v6 layout routes directly in `App.tsx`.
 * This provides a more declarative and maintainable routing structure.
 * The logic for choosing a layout is now structurally defined in the routing tree.
 * This file is kept for historical reference and will be removed in a future refactor.
 */
export function AppShell() {
  return (
    <>
      <Outlet />
    </>
  );
}
