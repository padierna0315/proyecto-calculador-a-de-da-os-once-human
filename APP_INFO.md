# Calculadora y Simulador de Daño para "Once Human"

Este repositorio contiene una aplicación de calculadora y simulador de DPS (Daño Por Segundo) diseñada para el videojuego "Once Human". Permite a los jugadores visualizar cómo las estadísticas de sus personajes, la selección de armas, armaduras y accesorios (y sus calibraciones) afectan su capacidad para infligir daño en diferentes escenarios.

## 🎯 ¿Qué hace la aplicación?

La aplicación es un **Simulador de Campo de Pruebas y Calculadora de Builds** en tiempo real.
- **Gestión de Equipamiento**: Permite al usuario equipar un arma primaria, secundaria, arma cuerpo a cuerpo (melee), y un conjunto completo de armadura (casco, máscara, chaqueta, pantalones, guantes, zapatos).
- **Configuración Detallada**: Los usuarios pueden ajustar factores críticos como el objetivo de disparo (cabeza/torso), el tipo de munición (Estándar, Acero, Tungsteno) y calibrar las estadísticas del arma.
- **Estadísticas Efectivas**: Calcula instantáneamente las estadísticas combinadas resultantes del equipamiento y modificadores activos, tales como ataque base, poder psíquico, tasa/daño crítico, y daño a puntos débiles.
- **Simulación Visual**: Incluye un "campo de pruebas" animado que dispara un arma al muñeco de entrenamiento, simulando daño con multiplicadores reales, mostrándolo numéricamente en la pantalla y activando "buffs" en la parte inferior de la interfaz.

## 🏗 Arquitectura y Tecnologías

El proyecto es una aplicación **Frontend Moderna (Single Page Application)**.
- **Framework Principal**: [React 19](https://react.dev/)
- **Empaquetador y Servidor**: [Vite](https://vitejs.dev/)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/) para un tipado estático robusto.
- **Estilos**: [Tailwind CSS 4](https://tailwindcss.com/) para un diseño utilitario y responsivo con tema oscuro (zinc/emerald).
- **Animaciones**: [Framer Motion](https://motion.dev/) para las transiciones y la simulación visual interactiva.
- **Estado Global**: [Zustand](https://github.com/pmndrs/zustand) para la gestión del inventario y las estadísticas de manera centralizada.
- **Iconos**: [Lucide React](https://lucide.dev/).

## 📂 Estructura del Proyecto

La lógica central se encuentra dentro del directorio `/src`:

- `/src/data/`: Bases de datos estáticas del juego.
  - `armor.ts`: Define todos los sets de armadura (`Lone Wolf`, `Falcon`, etc.), sus bonos de conjunto (1 a 4 piezas) y piezas individuales con efectos clave.
  - `weapons.ts`: Define las estadísticas base de todas las armas clasificadas por rareza/tier (`DBSG - Doombringer`, `AWS.338 - Bingo`, etc.), incluyendo su multiplicador crítico, RPM, capacidad y su "keyword" (ej. `TheBullseye`, `PowerSurge`).
  - `calibrations.ts`: Almacena los planos de calibración y modificadores de estadísticas.
- `/src/engine/`: Motor matemático de la simulación.
  - `Simulator.ts`: La clase `SimulationEngine` que ejecuta el bucle de simulación. Calcula ticks de tiempo, recargas, aplica la probabilidad de daño crítico o punto débil, y procesa las mecánicas especiales de las armas (ej. Shrapnel, Burn, Frost Vortex).
- `/src/store/`: Manejo del estado global.
  - `useBuildStore.ts`: El store de Zustand. Mantiene el equipo actual, configuraciones, estadísticas base (naked character) y métodos para calcular de forma reactiva los `EffectiveStats` tomando en cuenta todos los bonificadores equipados (armas, sets de armadura y calibraciones).
- `/src/types/`: Definición de tipos de TypeScript.
  - `game.ts`: Tipos estrictos para Armas, Armaduras, Stats y configuraciones de la simulación.
- `/src/App.tsx`: El componente visual primario de la aplicación que renderiza el HUD completo.

## ⚙️ ¿Cómo funciona el cálculo de daño (Motor de Simulación)?

El motor (basado en `Simulator.ts` y la función `getEffectiveStats` en Zustand) opera siguiendo estas reglas:

1. **Estadísticas Base y Suma de Bonos**:
   El store suma los valores base del personaje con los bonos otorgados por:
   - El arma primaria equipada.
   - Bonos de set de armadura (si se cumplen los requisitos de piezas).
   - Efectos del tipo de munición (ej. Tungsteno suma +10% de daño base y +10% de poder psíquico).
   - Calibraciones manuales ingresadas en la interfaz.

2. **Cálculo por Perdigón (Pellet)**:
   Si un arma dispara múltiples perdigones (ej. Escopeta), el daño base se divide entre la cantidad de perdigones y el cálculo crítico/punto débil se hace **por cada perdigón** de manera independiente.

3. **Multiplicadores Dinámicos (Fórmula general)**:
   ```text
   Daño Base del Arma = Ataque_Base_Arma * (1 + Bonus_Daño_Base_Arma)
   Daño con Psi (Nueva Fórmula) = (Daño_Base_Arma + (PoderPsíquico * 18.5)) * MultiplicadorMunición
   Daño del Perdigón = Daño con Psi / Cantidad_Perdigones
   ```
   Luego, en el momento del impacto se calculan los críticos y weakspots (multiplicadores aditivos entre sí):
   ```text
   Multiplicador = 1 + (EsCrítico ? DañoCrítico : 0) + (EsWeakspot ? DañoWeakspot : 0) + Vulnerabilidad
   Daño Final = Daño del Perdigón * Multiplicador * (1 + BonusDañoArma) * (1 + BonusDañoEnemigo) * Bonus Diana
   ```

4. **Simulación en Vivo (App.tsx)**:
   En `App.tsx` existe una simulación visual simplificada, que corre en un bucle async de acuerdo a los RPM del arma, consumiendo el cargador y luego aplicando tiempo de recarga. Mientras dispara, activa visualmente "Bufos" (ej. Buffos de Diana: Vulnerabilidad, Reducción de Daño, etc.).

## 🚀 Cómo ejecutar localmente

1. Clonar el repositorio.
2. Instalar dependencias: `npm install`
3. Iniciar entorno de desarrollo: `npm run dev`
4. Acceder al puerto indicado (por defecto `http://localhost:3000`).
