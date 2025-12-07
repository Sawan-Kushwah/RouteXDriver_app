import BusCard from "@/Components/BusCard";
import server from "@/utils/BackendServer";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

// ------------ TYPES ----------------
type Bus = {
    _id: string;
    busNo: number;
};

type RouteItem = {
    _id: string;
    routeNo: number | string;
    bus: Bus;
    stops: string[];
};

export default function Home() {
    const [routes, setRoutes] = useState<RouteItem[]>([]);
    const [filteredRoutes, setFilteredRoutes] = useState<RouteItem[]>([]);
    const [search, setSearch] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);

    const fetchData = async () => {
        try {
            const res = await axios.get(`${server}/routes/getAllAssignedRoutes/`);
            const data: RouteItem[] = res.data.routes;

            setRoutes(data);
            setFilteredRoutes(data);
        } catch (err) {
            console.log(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSearch = (text: string) => {
        setSearch(text);

        if (text.trim() === "") {
            setFilteredRoutes(routes);
            return;
        }

        const query = text.toLowerCase();

        const results = routes.filter((item) => {
            const busMatch = item.bus.busNo.toString().startsWith(query);
            const stopsMatch = item.stops.some((stop) =>
                stop.toLowerCase().includes(query)
            );

            return busMatch || stopsMatch;
        });

        setFilteredRoutes(results);
    };

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#ff3333" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.headerTitle}>
                Route<Text style={styles.redColor}>X</Text>
            </Text>

            <Text style={styles.title}>Select Your Bus Number</Text>

            <TextInput
                style={styles.searchBar}
                placeholder="Search bus number, route or stop..."
                placeholderTextColor="#999"
                value={search}
                onChangeText={handleSearch}
            />

            {filteredRoutes.length === 0 ? (
                <Text style={styles.noResult}>No results found</Text>
            ) : (
                filteredRoutes.map((item) => (
                    <BusCard
                        key={item._id}
                        busNo={item.bus.busNo}
                        routeNo={item.routeNo}
                        stops={item.stops}
                        searchQuery={search}
                        busId={item.bus._id}
                    />
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0d0000",
        padding: 16,
    },
    loading: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0d0000",
    },
    title: {
        fontSize: 25,
        fontWeight: "900",
        color: "#fff",
        textAlign: "center",
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: "900",
        color: "#fff",
        marginBottom: 10,
    },
    redColor: {
        color: "red",
    },
    searchBar: {
        backgroundColor: "#1a1a1a",
        padding: 12,
        borderRadius: 10,
        color: "#fff",
        borderColor: "#333",
        borderWidth: 1,
        marginBottom: 20,
    },
    noResult: {
        color: "#fff",
        fontSize: 18,
        textAlign: "center",
        marginTop: 25,
    },
});
