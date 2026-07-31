import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TemplatesPage } from "./TemplatesPage";

const mocks = vi.hoisted(() => ({
  listTemplates: vi.fn()
}));

vi.mock("../features/data/api", () => ({
  listTemplates: mocks.listTemplates
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TemplatesPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("TemplatesPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.listTemplates.mockReset();
  });

  it("shows an actionable error instead of an empty state when loading fails", async () => {
    mocks.listTemplates
      .mockRejectedValueOnce(new Error("ambiguous relationship"))
      .mockResolvedValueOnce([]);

    renderPage();

    expect(await screen.findByText("Vorlagen konnten nicht geladen werden.")).toBeInTheDocument();
    expect(screen.queryByText("Noch keine Vorlagen")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));

    expect(await screen.findByText("Noch keine Vorlagen")).toBeInTheDocument();
    expect(mocks.listTemplates).toHaveBeenCalledTimes(2);
  });
});
