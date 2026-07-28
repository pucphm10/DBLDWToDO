import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfigurationPage } from "./ConfigurationPage";

describe("configuration screen", () => {
  it("explains required public environment values", () => {
    render(<ConfigurationPage />);
    expect(screen.getByRole("heading", { name: /Supabase verbinden/i })).toBeInTheDocument();
    expect(screen.getByText(/VITE_SUPABASE_URL/)).toBeInTheDocument();
    expect(screen.getByText(/Service-Role-Key/)).toBeInTheDocument();
  });
});
