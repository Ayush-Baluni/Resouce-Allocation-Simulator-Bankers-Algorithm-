# Resource Allocation Simulator - Physical System Architecture

```mermaid
graph TB
    subgraph "Layer 1: Application Layer"
        Users[End Users]
        GUI[Web Interface]
    end

    subgraph "Layer 2: Interface Layer"
        ResourceInterface[Resource Management Interface]
        ProcessInterface[Process Management Interface]
    end

    subgraph "Layer 3: Core Functions Layer"
        subgraph ProcessMgmt[Process & Resource Management]
            ResourceHandler[Resource Handler]
            ProcessHandler[Process Handler]
            BankersAlgo[Banker's Algorithm]
        end
        
        subgraph StateMgmt[State Management]
            DataStructures[Data Structures]
            SafetyChecker[Safety Checker]
        end
        
        subgraph EventMgmt[Event Management]
            EventSystem[Event Handlers]
            ValidationSystem[Input Validation]
        end
    end

    subgraph "Layer 4: Presentation Layer"
        MatrixDisplay[Allocation Matrix]
        Charts[Resource Charts]
        Logger[System Log]
        StatusDisplay[System Status Display]
    end

    %% Flow connections
    Users --> GUI
    GUI --> ResourceInterface
    GUI --> ProcessInterface
    
    ResourceInterface --> ResourceHandler
    ProcessInterface --> ProcessHandler
    
    ResourceHandler --> BankersAlgo
    ProcessHandler --> BankersAlgo
    BankersAlgo --> SafetyChecker
    SafetyChecker --> DataStructures
    
    DataStructures --> MatrixDisplay
    DataStructures --> Charts
    DataStructures --> StatusDisplay
    
    %% Logger connections
    ResourceHandler --> Logger
    ProcessHandler --> Logger
    BankersAlgo --> Logger
    SafetyChecker --> Logger
    ValidationSystem --> Logger
    EventSystem --> Logger
    
    %% Status update flows
    ResourceHandler --> EventSystem
    ProcessHandler --> EventSystem
    SafetyChecker --> StatusDisplay