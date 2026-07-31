import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "./AppLayout";

const mocks = vi.hoisted(() => ({
  seedWorkspace: vi.fn(),
  signOut: vi.fn()
}));

vi.mock("../features/data/api", () => ({
  seedWorkspace: mocks.seedWorkspace
}));

vi.mock("./AuthProvider", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    signOut: mocks.signOut
  })
}));

function renderLayout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/templates"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/templates" element={<p>Vorlageninhalt</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("workspace initialization", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.seedWorkspace.mockReset();
    mocks.signOut.mockReset();
  });

  it("waits for the standard templates before rendering the page", async () => {
    let finishSeed: (count: number) => void = () => undefined;
    mocks.seedWorkspace.mockReturnValue(new Promise<number>((resolve) => {
      finishSeed = resolve;
    }));

    renderLayout();

    expect(screen.getByLabelText("Lädt")).toBeInTheDocument();
    expect(screen.queryByText("Vorlageninhalt")).not.toBeInTheDocument();

    await act(async () => finishSeed(3));

    expect(await screen.findByText("Vorlageninhalt")).toBeInTheDocument();
  });

  it("shows a retry instead of silently ignoring a seed error", async () => {
    mocks.seedWorkspace
      .mockRejectedValueOnce(new Error("seed failed"))
      .mockResolvedValueOnce(0);

    renderLayout();

    expect(await screen.findByRole("heading", { name: /Arbeitsbereich konnte nicht eingerichtet werden/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));

    expect(await screen.findByText("Vorlageninhalt")).toBeInTheDocument();
    expect(mocks.seedWorkspace).toHaveBeenCalledTimes(2);
  });
});
