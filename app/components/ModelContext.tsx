"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
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
				const storedModel = localStorage.getItem("selectedModel");
				if (storedModel && res.models.includes(storedModel)) {
					setSelectedModel(storedModel);
				} else {
					setSelectedModel(res.models[0]);
				}
			}
		});
	}, []);

	const handleSetSelectedModel = (model: string) => {
		setSelectedModel(model);
		localStorage.setItem("selectedModel", model);
	};

	return (
		<ModelContext.Provider
			value={{
				models,
				selectedModel,
				setSelectedModel: handleSetSelectedModel,
			}}
		>
			{children}
		</ModelContext.Provider>
	);
}

export function useModel() {
	return useContext(ModelContext);
}
