"use client";

import Link from "next/link";
import {
  MessageSquareIcon,
  SettingsIcon,
  ChevronRightIcon,
} from "lucide-animated";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8">
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6 text-center">
          Welcome
        </h2>
        <div className="flex flex-col gap-4">
          <Link
            href="/chat"
            className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors group border border-zinc-200 dark:border-zinc-700"
          >
            <div className="flex items-center gap-4">
              <MessageSquareIcon className="text-blue-500" size={24} />
              <div className="flex flex-col">
                <span className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  LLM Chat
                </span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Start a conversation with the Compliance LLM
                </span>
              </div>
            </div>
            <ChevronRightIcon
              className="text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
              size={20}
            />
          </Link>

          <button
            disabled
            className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 opacity-50 cursor-not-allowed border border-zinc-200 dark:border-zinc-700"
          >
            <div className="flex items-center gap-4 text-left">
              <SettingsIcon className="text-zinc-500" size={24} />
              <div className="flex flex-col">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  Settings
                </span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Coming soon
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
