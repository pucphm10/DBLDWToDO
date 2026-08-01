import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteProduction, getTemplate, listTemplates } from "./api";

const mocks = vi.hoisted(() => ({
  from: vi.fn()
}));

vi.mock("../../lib/supabase", () => ({
  supabase: { from: mocks.from }
}));

describe("template queries", () => {
  beforeEach(() => {
    mocks.from.mockReset();
  });

  it("disambiguates the template versions relationship when listing templates", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.from.mockReturnValue({ select });

    await listTemplates();

    expect(select).toHaveBeenCalledWith(
      "*, formats(name,slug), template_versions!template_versions_template_id_fkey(version_number)"
    );
  });

  it("disambiguates the template versions relationship on template details", async () => {
    const templateSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "template-1", current_version_id: "version-1" },
          error: null
        })
      })
    });
    const sectionsSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    });
    mocks.from
      .mockReturnValueOnce({ select: templateSelect })
      .mockReturnValueOnce({ select: sectionsSelect });

    await getTemplate("template-1");

    expect(templateSelect).toHaveBeenCalledWith(
      "*, formats(name,slug), template_versions!template_versions_template_id_fkey(*)"
    );
  });

  it("deletes only the selected production", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockReturnValue({ eq });
    mocks.from.mockReturnValue({ delete: remove });

    await deleteProduction("production-1");

    expect(mocks.from).toHaveBeenCalledWith("productions");
    expect(remove).toHaveBeenCalledOnce();
    expect(eq).toHaveBeenCalledWith("id", "production-1");
  });
});
