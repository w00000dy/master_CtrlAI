"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getModels } from "../actions";

type ModelContextType = {
  models: string[];
  selectedModel: string;
  setSelectedModel: (model: string) => void;
};

const ModelContext = createContext<ModelContextType>({
  models: [],
  selectedModel: "",
  setSelectedModel: () => {},
});

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");

  useEffect(() => {
    getModels().then((res) => {
      if (res.success && res.models?.length) {
        setModels(res.models);
        setSelectedModel(res.models[0]);
      }
    });
  }, []);

  return (
    <ModelContext.Provider value={{ models, selectedModel, setSelectedModel }}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModel() {
  return useContext(ModelContext);
}
