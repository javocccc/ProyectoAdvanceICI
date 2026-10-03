# Producto

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React con TypeScript y Vite, solicitado por Javier. Firebase Authentication, Cloud Firestore y Storage quedan preparados para conectar un proyecto que aún no existe. El modo de demostración usa datos ficticios.

## Users

La Dirección del Programa Advance de Ingeniería Civil Industrial de la Universidad Central registra y consulta los expedientes de titulación. En el MVP, estudiantes, docentes y personal de Colegiatura no ingresan al sistema.

## Product Purpose

Centralizar datos, notas, comisión, acta escaneada y estado de colegiatura de cada expediente para que Dirección pueda conocer y actualizar el avance sin reconstruirlo desde varias plataformas.

## Operating Context

Proyecto académico grupal de tres integrantes: Javier Carrasco, Matias Olivares y Fabian Silva. La primera evaluación cubre frontend. Se exige un repositorio público con al menos diez commits por integrante. Javier lidera la integración de ramas. La implementación debe poder explicarse y modificarse durante una evaluación oral o práctica.

## Capabilities and Constraints

- Flujo del MVP: inicio de sesión, panel, registro, búsqueda y ficha de expediente, nota y comisión, acta PDF, estado de colegiatura.
- Para esta evaluación se usará inicio de sesión normal. La credencial institucional figura en los requisitos originales, pero no está disponible todavía.
- React Context proporciona el estado de autenticación a la interfaz. TypeScript define interfaces para los datos y las props.
- `sessionStorage` guarda preferencias de la sesión de demostración; `localStorage` guarda datos ficticios de trabajo hasta conectar Firebase. No deben guardarse contraseñas ni documentos reales ahí.
- La conexión Firebase queda parametrizada porque el proyecto Firebase todavía no ha sido creado.
- La interfaz debe conservar una relación cromática con la captura aportada, manteniendo un diseño original.
- El código y la guía de trabajo deben explicar conceptos y lugares concretos para cambiar tamaños, colores y textos.

## Evidence on Hand

- `Contexto/Requerimientos_grupoAdvanceICI.docx`: requisitos RF-01 a RF-10 y RNF-01 a RNF-07.
- `Contexto/Lab3GestionDocumentalICI.docx`: historias HU-01 a HU-12, criterios, flujo y pantallas P-01 a P-07.
- `Contexto/Clase2_ConceptosDesarrolloWeb.pptx` a `Contexto/Clase9_AplicacionPractica.pptx`: contenidos de HTML, CSS, JavaScript, Git, React, TypeScript, componentes, props, estado, eventos y almacenamiento local.
- `Contexto/DiseñoContexto.jpg`: referencia cromática del portal universitario.
- No hay datos reales de estudiantes ni configuración Firebase.

## Product Principles

1. Mostrar el estado de cada expediente de forma rápida y legible.
2. Permitir a Javier y sus compañeros explicar cada archivo y modificar la interfaz con cambios pequeños.
3. Mantener límites de archivos claros para que tres ramas se puedan integrar con pocos conflictos.
4. Separar el modo de demostración de las credenciales y datos reales.
