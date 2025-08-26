import React, { useState, useEffect, useMemo } from "react";
import { Search, Filter, Eye, Code, Palette, Type, Layers, GitBranch, Info } from "lucide-react";

const DesignSystemVisualizer = () => {
  const [variables, setVariables] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");
  const [selectedToken, setSelectedToken] = useState(null);
  const [hoveredToken, setHoveredToken] = useState(null);

  // Fetch variables
  useEffect(() => {
    const fetchVariables = async () => {
      try {
        const response = await fetch(
          "https://design-system.tiiny.site/Canon-Design-System-variables.json"
        );
        const data = await response.json();
        const processedVariables = [];

        data.collections.forEach((collection) => {
          let collectionType = "raw";
          if (["Typography", "Color"].includes(collection.name)) {
            collectionType = "foundation";
          } else if (collection.name === "Components") {
            collectionType = "component";
          }

          collection.variables.forEach((variable) => {
            const firstMode = Object.keys(variable.valuesByMode)[0];
            const modeValue = variable.valuesByMode[firstMode];
            
            processedVariables.push({
              name: variable.name,
              type: variable.resolvedType,
              collection: collection.name,
              collectionType,
              valuesByMode: variable.valuesByMode,
              aliasOf: modeValue && modeValue.aliasOf ? modeValue.aliasOf : null,
            });
          });
        });

        setVariables(processedVariables);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching variables:", error);
        setLoading(false);
      }
    };

    fetchVariables();
  }, []);

  // Filter variables
  const filteredVariables = useMemo(() => {
    return variables.filter((variable) => {
      const matchesSearch = variable.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCollection =
        selectedCollection === "all" ||
        variable.collectionType === selectedCollection;
      const matchesType =
        selectedType === "all" || variable.type === selectedType;
      return matchesSearch && matchesCollection && matchesType;
    });
  }, [variables, searchTerm, selectedCollection, selectedType]);

  const uniqueTypes = useMemo(() => {
    const types = [...new Set(variables.map((v) => v.type))];
    return types.sort();
  }, [variables]);

  const formatValue = (variable) => {
    const firstMode = Object.keys(variable.valuesByMode)[0];
    const value = variable.valuesByMode[firstMode];
    if (variable.aliasOf) return "→ " + variable.aliasOf;
    if (variable.type === "COLOR" && value.value) {
      const color = value.value;
      const r = Math.round(color.r * 255);
      const g = Math.round(color.g * 255);
      const b = Math.round(color.b * 255);
      return "rgba(" + r + ", " + g + ", " + b + ", " + color.a + ")";
    }
    if (typeof value.value === "number") return value.value.toString();
    if (typeof value.value === "string") return value.value;
    if (typeof value.value === "boolean") return value.value.toString();
    return JSON.stringify(value.value);
  };

  const getColorPreview = (variable) => {
    if (variable.type !== "COLOR" || variable.aliasOf) return null;
    const firstMode = Object.keys(variable.valuesByMode)[0];
    const value = variable.valuesByMode[firstMode];
    if (!value || !value.value || typeof value.value !== "object") return null;
    const color = value.value;
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    return "rgba(" + r + ", " + g + ", " + b + ", " + color.a + ")";
  };

  const getCollectionIcon = (collectionType) => {
    if (collectionType === "raw") return React.createElement(Palette, { className: "w-4 h-4" });
    if (collectionType === "foundation") return React.createElement(Type, { className: "w-4 h-4" });
    if (collectionType === "component") return React.createElement(Layers, { className: "w-4 h-4" });
    return React.createElement(Code, { className: "w-4 h-4" });
  };

  const getCollectionColor = (collectionType, isHovered = false) => {
    const baseColors = {
      raw: isHovered ? "bg-blue-200 text-blue-900" : "bg-blue-100 text-blue-800",
      foundation: isHovered ? "bg-emerald-200 text-emerald-900" : "bg-emerald-100 text-emerald-800",
      component: isHovered ? "bg-violet-200 text-violet-900" : "bg-violet-100 text-violet-800",
    };
    return baseColors[collectionType] || (isHovered ? "bg-gray-200 text-gray-900" : "bg-gray-100 text-gray-800");
  };

  const getTypeColor = (type, isHovered = false) => {
    const typeColors = {
      COLOR: isHovered ? "bg-red-200 text-red-900" : "bg-red-100 text-red-800",
      FLOAT: isHovered ? "bg-orange-200 text-orange-900" : "bg-orange-100 text-orange-800",
      STRING: isHovered ? "bg-teal-200 text-teal-900" : "bg-teal-100 text-teal-800",
      BOOLEAN: isHovered ? "bg-indigo-200 text-indigo-900" : "bg-indigo-100 text-indigo-800",
    };
    return typeColors[type] || (isHovered ? "bg-slate-200 text-slate-900" : "bg-slate-100 text-slate-800");
  };

  const stats = useMemo(() => {
    const raw = variables.filter((v) => v.collectionType === "raw").length;
    const foundation = variables.filter((v) => v.collectionType === "foundation").length;
    const component = variables.filter((v) => v.collectionType === "component").length;
    return { raw, foundation, component, total: variables.length };
  }, [variables]);

  const findTokenDependencies = (tokenName) => {
    return variables.filter((v) => v.aliasOf === tokenName);
  };

  const isLeafNode = (token) => {
    return findTokenDependencies(token.name).length === 0;
  };

  const handleTokenClick = (token) => {
    console.log("Token clicked:", token.name);
    setSelectedToken(token);
    setActiveTab("map");
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const renderTooltip = (token, isVisible) => {
    if (!isVisible) return null;
    
    return React.createElement(
      "div",
      {
        className: "absolute z-50 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl border border-gray-700 max-w-xs",
        style: { 
          top: "-10px", 
          left: "100%", 
          marginLeft: "8px",
          transform: "translateY(-50%)"
        }
      },
      React.createElement("div", { className: "font-semibold mb-1" }, token.name),
      React.createElement("div", { className: "text-gray-300 mb-1" }, "Type: " + token.type),
      React.createElement("div", { className: "text-gray-300 mb-1" }, "Collection: " + token.collection),
      React.createElement("div", { className: "text-gray-300" }, "Value: " + formatValue(token)),
      isLeafNode(token) && React.createElement(
        "div", 
        { className: "text-amber-300 mt-1 text-xs" }, 
        "🍃 Leaf Node"
      )
    );
  };

  const renderCollectionBadge = (collectionType, isHovered = false) => {
    let text = "Raw";
    if (collectionType === "foundation") text = "Foundation";
    if (collectionType === "component") text = "Component";
    
    return React.createElement(
      "span",
      {
        className: "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-700 " + getCollectionColor(collectionType, isHovered)
      },
      getCollectionIcon(collectionType),
      text
    );
  };

  const renderDependencyNode = (token, level, onTokenClick) => {
    const dependencies = findTokenDependencies(token.name);
    const hasChildren = dependencies.length > 0;
    const marginLeft = level * 20;
    const isLeaf = isLeafNode(token);
    const isHovered = hoveredToken === token.name;
    
    return React.createElement(
      "div",
      {
        key: token.name + "-" + level,
        style: { marginLeft: marginLeft + "px" },
        className: "mb-3 relative"
      },
      React.createElement(
        "div",
        {
          className: `group flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-700 cursor-pointer ${
            isLeaf 
              ? isHovered 
                ? "bg-amber-50 border-amber-300 transform scale-10" 
                : "bg-amber-25 border-amber-200 hover:border-amber-300"
              : isHovered
                ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 transform scale-10"
                : "bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200 hover:border-blue-300"
          }`,
          onClick: () => onTokenClick(token),
          onMouseEnter: () => setHoveredToken(token.name),
          onMouseLeave: () => setHoveredToken(null)
        },
        hasChildren && React.createElement(GitBranch, { 
          className: `w-5 h-5 transition-colors duration-700 ${
            isHovered ? "text-blue-600" : "text-gray-500"
          }` 
        }),
        isLeaf && React.createElement("span", { 
          className: "text-amber-500 text-lg" 
        }, "🍃"),
        renderCollectionBadge(token.collectionType, isHovered),
        React.createElement(
          "span", 
          { 
            className: `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-700 ${getTypeColor(token.type, isHovered)}` 
          }, 
          token.type
        ),
        React.createElement(
          "span", 
          { 
            className: `font-mono text-sm truncate transition-colors duration-700 ${
              isHovered ? "text-gray-900 font-semibold" : "text-gray-700"
            }` 
          }, 
          token.name
        ),
        getColorPreview(token) && React.createElement("div", {
          className: `w-6 h-6 rounded-lg border-2 transition-all duration-700 ${
            isHovered ? "border-gray-400 transform scale-110" : "border-gray-300"
          }`,
          style: { backgroundColor: getColorPreview(token) }
        }),
        React.createElement(Info, { 
          className: `w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${
            isHovered ? "text-blue-600" : "text-gray-400"
          }` 
        }),
        renderTooltip(token, isHovered)
      ),
      hasChildren && level < 4 && React.createElement(
        "div",
        { className: "mt-3 ml-2 border-l-2 border-gray-200 pl-4" },
        dependencies.map((dep, idx) => renderDependencyNode(dep, level + 1, onTokenClick))
      )
    );
  };

  if (loading) {
    return React.createElement(
      "div",
      { className: "min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center" },
      React.createElement(
        "div",
        { className: "text-center" },
        React.createElement("div", { className: "animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-6" }),
        React.createElement("p", { className: "text-gray-600 text-lg" }, "Loading Canon Design System variables...")
      )
    );
  }

  return React.createElement(
    "div",
    { className: "min-h-screen bg-gradient-to-br from-gray-50 to-blue-50" },
    React.createElement(
      "div",
      { className: "w-full min-h-screen mx-auto p-8" },
      React.createElement(
        "div",
        { className: "grid grid-cols-1 lg:grid-cols-2 gap-8" },
        
        // Left column: list
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            { className: "mb-8" },
            React.createElement("h1", { className: "text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-3" }, "Canon Design System"),
            React.createElement("p", { className: "text-gray-700 mb-8 text-lg" }, "Variables Visualiser - Raw Tokens, Foundation Tokens, and Component Tokens"),
            
            // Stats
            React.createElement(
              "div",
              { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" },
              React.createElement(
                "div",
                { className: "bg-white p-5 rounded-xl shadow-sm border-2 border-gray-100 hover:border-gray-200 transition-all duration-700" },
                React.createElement(
                  "div",
                  { className: "flex items-center gap-3" },
                  React.createElement(Eye, { className: "w-6 h-6 text-gray-600" }),
                  React.createElement("span", { className: "font-bold text-xl text-gray-900" }, stats.total)
                ),
                React.createElement("p", { className: "text-sm text-gray-600 mt-1" }, "Total Variables")
              ),
              React.createElement(
                "div",
                { className: "bg-white p-5 rounded-xl shadow-sm border-2 border-blue-100 hover:border-blue-200 transition-all duration-700" },
                React.createElement(
                  "div",
                  { className: "flex items-center gap-3" },
                  React.createElement(Palette, { className: "w-6 h-6 text-blue-600" }),
                  React.createElement("span", { className: "font-bold text-xl text-gray-900" }, stats.raw)
                ),
                React.createElement("p", { className: "text-sm text-gray-600 mt-1" }, "Raw Tokens")
              ),
              React.createElement(
                "div",
                { className: "bg-white p-5 rounded-xl shadow-sm border-2 border-emerald-100 hover:border-emerald-200 transition-all duration-700" },
                React.createElement(
                  "div",
                  { className: "flex items-center gap-3" },
                  React.createElement(Type, { className: "w-6 h-6 text-emerald-600" }),
                  React.createElement("span", { className: "font-bold text-xl text-gray-900" }, stats.foundation)
                ),
                React.createElement("p", { className: "text-sm text-gray-600 mt-1" }, "Foundation Tokens")
              ),
              React.createElement(
                "div",
                { className: "bg-white p-5 rounded-xl shadow-sm border-2 border-violet-100 hover:border-violet-200 transition-all duration-700" },
                React.createElement(
                  "div",
                  { className: "flex items-center gap-3" },
                  React.createElement(Layers, { className: "w-6 h-6 text-violet-600" }),
                  React.createElement("span", { className: "font-bold text-xl text-gray-900" }, stats.component)
                ),
                React.createElement("p", { className: "text-sm text-gray-600 mt-1" }, "Component Tokens")
              )
            )
          ),

          // Filters
          React.createElement(
            "div",
            { className: "bg-white p-6 rounded-xl shadow-sm border-2 border-gray-100 mb-6" },
            React.createElement(
              "div",
              { className: "flex flex-col lg:flex-row gap-4" },
              React.createElement(
                "div",
                { className: "flex-1 relative" },
                React.createElement(Search, { className: "absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" }),
                React.createElement("input", {
                  id: "search-variables",
                  name: "search-variables",
                  type: "text",
                  value: searchTerm,
                  onChange: (e) => setSearchTerm(e.target.value),
                  placeholder: "Search variables...",
                  className: "w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-700"
                })
              ),
              React.createElement(
                "div",
                { className: "lg:w-52" },
                React.createElement(
                  "select",
                  {
                    id: "collection-filter",
                    name: "collection-filter",
                    className: "w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-700",
                    value: selectedCollection,
                    onChange: (e) => setSelectedCollection(e.target.value)
                  },
                  React.createElement("option", { value: "all" }, "All Collections"),
                  React.createElement("option", { value: "raw" }, "Raw Tokens"),
                  React.createElement("option", { value: "foundation" }, "Foundation Tokens"),
                  React.createElement("option", { value: "component" }, "Component Tokens")
                )
              ),
              React.createElement(
                "div",
                { className: "lg:w-48" },
                React.createElement(
                  "select",
                  {
                    id: "type-filter",
                    name: "type-filter",
                    className: "w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-700",
                    value: selectedType,
                    onChange: (e) => setSelectedType(e.target.value)
                  },
                  React.createElement("option", { value: "all" }, "All Types"),
                  uniqueTypes.map((type) =>
                    React.createElement("option", { key: type, value: type }, type)
                  )
                )
              )
            ),
            React.createElement(
              "div",
              { className: "mt-4 text-sm font-medium text-gray-600" },
              "Showing " + filteredVariables.length + " of " + variables.length + " variables"
            )
          ),

          // Variables List
          React.createElement(
            "div",
            { className: "space-y-4 max-h-100 overflow-y-auto" },
            filteredVariables.map((variable, index) => {
              const isHovered = hoveredToken === variable.name;
              const isLeaf = isLeafNode(variable);
              
              return React.createElement(
                "div",
                {
                  key: variable.collection + "-" + variable.name + "-" + index,
                  className: `group bg-white p-8 rounded-xl shadow-sm border-2 transition-all duration-900 cursor-pointer ${
                    isLeaf 
                      ? isHovered
                        ? "border-amber-300"
                        : "border-amber-100 hover:border-amber-200"
                      : isHovered
                        ? "border-blue-300"
                        : "border-gray-100 hover:border-blue-200"
                  }`,
                  onClick: () => handleTokenClick(variable),
                  onMouseEnter: () => setHoveredToken(variable.name),
                  onMouseLeave: () => setHoveredToken(null)
                },
                React.createElement(
                  "div",
                  { className: "flex items-start justify-between" },
                  React.createElement(
                    "div",
                    { className: "flex-1 min-w-0" },
                    React.createElement(
                      "div",
                      { className: "flex items-center gap-3 mb-3 flex-wrap" },
                      renderCollectionBadge(variable.collectionType, isHovered),
                      React.createElement(
                        "span",
                        { className: `inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-700 ${getTypeColor(variable.type, isHovered)}` },
                        variable.type
                      ),
                      isLeaf && React.createElement(
                        "span",
                        { className: `text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-700 ${
                          isHovered ? "text-amber-900 bg-amber-200" : "text-amber-800 bg-amber-100"
                        }` },
                        "🍃 Leaf Node"
                      ),
                      variable.aliasOf && React.createElement(
                        "span",
                        { className: `text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-700 ${
                          isHovered ? "text-blue-900 bg-blue-200" : "text-blue-700 bg-blue-100"
                        }` },
                        "Has References"
                      ),
                      findTokenDependencies(variable.name).length > 0 && React.createElement(
                        "span",
                        { className: `text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-700 ${
                          isHovered ? "text-emerald-900 bg-emerald-200" : "text-emerald-700 bg-emerald-100"
                        }` },
                        findTokenDependencies(variable.name).length + " Dependencies"
                      )
                    ),
                    React.createElement("h3", { 
                      className: `text-lg font-bold text-gray-900 mb-2 font-mono transition-colors duration-700 ${
                        isHovered ? "text-blue-900" : ""
                      }` 
                    }, variable.name),
                    React.createElement("p", { 
                      className: `text-sm text-gray-600 mb-3 transition-colors duration-700 ${
                        isHovered ? "text-gray-800" : ""
                      }` 
                    }, "Collection: " + variable.collection),
                    React.createElement(
                      "div",
                      { className: "flex items-center gap-4" },
                      getColorPreview(variable) && React.createElement("div", {
                        className: `w-10 h-10 rounded-lg border-2 transition-all duration-700 ${
                          isHovered ? "border-gray-400 transform scale-110" : "border-gray-300"
                        }`,
                        style: { backgroundColor: getColorPreview(variable) }
                      }),
                      React.createElement("code", { 
                        className: `text-sm px-3 py-2 rounded-lg font-mono transition-all duration-700 ${
                          isHovered ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-800"
                        }` 
                      }, formatValue(variable))
                    )
                  )
                )
              );
            }),
            filteredVariables.length === 0 && React.createElement(
              "div",
              { className: "bg-white p-12 rounded-xl shadow-sm border-2 border-gray-100 text-center" },
              React.createElement(Filter, { className: "w-16 h-16 text-gray-300 mx-auto mb-6" }),
              React.createElement("h3", { className: "text-xl font-bold text-gray-900 mb-3" }, "No variables found"),
              React.createElement("p", { className: "text-gray-600" }, "Try adjusting your search or filter criteria.")
            )
          )
        ),

        // Right column: Dependency Map
        React.createElement(
          "div",
          { className: "sticky top-0 h-screen overflow-y-auto" }, // Sticky + full height + scrollable
          
          React.createElement(
            "div",
            { className: "flex gap-2 border-b-2 border-gray-200 mb-6" },
            React.createElement(
              "button",
              {
                onClick: () => handleTabChange("map"),
                className: activeTab === "map"
                  ? "px-6 py-3 text-sm font-bold rounded-t-xl bg-blue-600 text-white"
                  : "px-6 py-3 text-sm font-semibold rounded-t-xl bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-all duration-700"
              },
              "Dependency Map"
            )
          ),

          activeTab === "map" && React.createElement(
            "div",
            { className: "bg-white min-h-screen p-6 rounded-xl shadow-sm border-2 border-gray-100" },
            selectedToken ? React.createElement(
              "div",
              null,
              React.createElement(
                "div",
                { className: "mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200" },
                React.createElement("h2", { className: "text-2xl font-bold mb-3 text-gray-900" }, "Token Relationships: " + selectedToken.name),
                React.createElement(
                  "div",
                  { className: "flex items-center gap-3 mb-4 flex-wrap" },
                  renderCollectionBadge(selectedToken.collectionType),
                  React.createElement(
                    "span",
                    { className: `inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getTypeColor(selectedToken.type)}` },
                    selectedToken.type
                  ),
                  isLeafNode(selectedToken) && React.createElement(
                    "span",
                    { className: "text-xs font-semibold px-3 py-1.5 rounded-full text-amber-800 bg-amber-100" },
                    "🍃 Leaf Node"
                  ),
                  React.createElement(
                    "span",
                    { className: "text-sm text-gray-700 bg-white px-3 py-2 rounded-lg font-mono shadow-sm" },
                    "Value: " + formatValue(selectedToken)
                  )
                )
              ),

              React.createElement(
                "div",
                { className: "space-y-8" },
                selectedToken.aliasOf && React.createElement(
                  "div",
                  null,
                  React.createElement("h3", { className: "text-xl font-bold mb-4 text-gray-800 flex items-center gap-2" }, 
                    React.createElement(GitBranch, { className: "w-5 h-5 text-blue-600" }),
                    "References:"
                  ),
                  React.createElement(
                    "div",
                    { className: "bg-blue-50 p-4 rounded-xl border-2 border-blue-200" },
                    React.createElement(
                      "div",
                      { className: "flex items-center gap-3" },
                      React.createElement(
                        "span",
                        { className: "text-blue-800 font-medium" },
                        "This token references: ",
                        React.createElement("code", { className: "font-mono bg-blue-100 px-2 py-1 rounded text-blue-900" }, selectedToken.aliasOf)
                      )
                    )
                  )
                ),

                React.createElement(
                  "div",
                  null,
                  React.createElement(
                    "h3",
                    { className: "text-xl font-bold mb-4 text-gray-800 flex items-center gap-2" },
                    React.createElement(Layers, { className: "w-5 h-5 text-gray-600" }),
                    "Used by (" + findTokenDependencies(selectedToken.name).length + " tokens):"
                  ),
                  React.createElement(
                    "div",
                    { className: "max-h-100 overflow-y-auto pr-2" },
                    findTokenDependencies(selectedToken.name).length > 0 
                      ? renderDependencyNode(selectedToken, 0, (token) => {
                          console.log("Dependency node clicked:", token.name);
                          setSelectedToken(token);
                        })
                      : React.createElement(
                          "div",
                          { className: "text-center py-12 text-gray-500" },
                          React.createElement(GitBranch, { className: "w-12 h-12 mx-auto mb-4 opacity-30" }),
                          React.createElement("p", { className: "text-lg font-medium mb-2" }, "No tokens reference this variable"),
                          React.createElement("p", { className: "text-sm" }, "This appears to be a leaf node in the design system"),
                          React.createElement("div", { className: "mt-4 text-4xl" }, "🍃")
                        )
                  )
                )
              )
            ) : React.createElement(
              "div",
              { className: "text-center py-16" },
              React.createElement(GitBranch, { className: "w-16 h-16 text-gray-300 mx-auto mb-6" }),
              React.createElement("h3", { className: "text-xl font-bold text-gray-900 mb-3" }, "Select a Token"),
              React.createElement("p", { className: "text-gray-600" }, "Click on any token from the list to view its relationships and dependencies.")
            )
          )
        )
      )
    )
  );
};

export default DesignSystemVisualizer;
                