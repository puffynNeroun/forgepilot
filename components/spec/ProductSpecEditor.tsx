"use client";

import { useActionState } from "react";

type ProductSpecActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: {
    title?: string[];
    content?: string[];
  };
  values?: {
    title: string;
    content: string;
  };
};

type ProductSpecEditorProps = {
  title: string;
  content: string;
  action: (
    previousState: ProductSpecActionState,
    formData: FormData,
  ) => Promise<ProductSpecActionState>;
};

const initialActionState: ProductSpecActionState = {
  ok: false,
  message: "",
};

export function ProductSpecEditor({
  title,
  content,
  action,
}: ProductSpecEditorProps) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialActionState,
  );

  const titleValue = state.values?.title ?? title;
  const contentValue = state.values?.content ?? content;

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label
          className="block text-sm font-medium text-slate-200"
          htmlFor="title"
        >
          Spec title
        </label>
        <input
          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
          defaultValue={titleValue}
          id="title"
          maxLength={120}
          minLength={3}
          name="title"
          required
        />
        {state.fieldErrors?.title?.map((error) => (
          <p className="text-sm text-red-300" key={error}>
            {error}
          </p>
        ))}
      </div>

      <div className="space-y-2">
        <label
          className="block text-sm font-medium text-slate-200"
          htmlFor="content"
        >
          Spec content
        </label>
        <textarea
          className="min-h-80 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm leading-6 text-slate-100 outline-none transition focus:border-sky-400"
          defaultValue={contentValue}
          id="content"
          maxLength={20000}
          minLength={20}
          name="content"
          required
        />
        {state.fieldErrors?.content?.map((error) => (
          <p className="text-sm text-red-300" key={error}>
            {error}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="rounded-xl bg-sky-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Saving..." : "Save product spec"}
        </button>

        {state.message ? (
          <p
            className={
              state.ok
                ? "text-sm text-emerald-300"
                : "text-sm text-red-300"
            }
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
