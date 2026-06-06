module iwas_contract::iwas {
    use std::string::String;
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use std::vector;

    // A single mark entry
    public struct Mark has store, drop, copy {
        blob_id: String,
        mark_type: String,
        emotion: String,
        timestamp: u64,
        wallet_address: address,
    }

    // The shared global index holding all marks
    public struct Wall has key {
        id: UID,
        marks: vector<Mark>,
    }

    // Event emitted when a mark is added
    public struct MarkAdded has copy, drop {
        blob_id: String,
        mark_type: String,
        emotion: String,
        timestamp: u64,
        wallet_address: address,
    }

    // Initialize the shared Wall object
    fun init(ctx: &mut TxContext) {
        let wall = Wall {
            id: object::new(ctx),
            marks: vector[],
        };
        transfer::share_object(wall);
    }

    // Add a mark to the Wall
    public entry fun add_mark(
        wall: &mut Wall,
        blob_id: String,
        mark_type: String,
        emotion: String,
        timestamp: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let mark = Mark {
            blob_id,
            mark_type,
            emotion,
            timestamp,
            wallet_address: sender,
        };
        
        // Add to the shared vector
        vector::push_back(&mut wall.marks, mark);

        // Emit an event
        event::emit(MarkAdded {
            blob_id,
            mark_type,
            emotion,
            timestamp,
            wallet_address: sender,
        });
    }
}
