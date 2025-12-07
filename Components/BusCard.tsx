import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type BusCardProps = {
    busNo: string | number;
    routeNo: string | number;
    stops: string[];
    searchQuery: string;
    busId: string;
};

export default function BusCard({ busNo, routeNo, stops, searchQuery, busId }: BusCardProps) {
    const router = useRouter();
    const [expanded, setExpanded] = useState(false);

    const highlight = (text: string) => {
        if (!searchQuery || searchQuery.trim() === "") {
            return <Text style={styles.normalText}>{text}</Text>;
        }

        const query = searchQuery.toLowerCase();
        const regex = new RegExp(`(${query})`, "gi");
        const parts = text.split(regex);

        return parts.map((part, index) =>
            part.toLowerCase() === query ? (
                <Text key={index} style={styles.highlight}>
                    {part}
                </Text>
            ) : (
                <Text key={index} style={styles.normalText}>
                    {part}
                </Text>
            )
        );
    };

    const getReorderedStops = (): string[] => {
        if (!searchQuery || searchQuery.trim() === "") return stops;

        const query = searchQuery.toLowerCase();

        const matched = stops.filter((s) =>
            s.toLowerCase().includes(query)
        );

        const others = stops.filter((s) =>
            !s.toLowerCase().includes(query)
        );

        return [...matched, ...others];
    };

    const reorderedStops = getReorderedStops();

    const firstThree = reorderedStops.slice(0, 3);
    const remaining = reorderedStops.length - 3;

    const displayedStops = expanded ? reorderedStops : firstThree;

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => {
                router.push({
                    pathname: "/buslocation",
                    params: {
                        busNo: busNo.toString(),
                        routeNo: routeNo.toString(),
                        busId: busId
                    }
                });
            }}
        >
            <View style={{ flex: 1 }}>
                <Text style={styles.title}>
                    Bus Number #{highlight(busNo.toString())}
                </Text>

                <Text style={styles.route}>
                    Route #{highlight(routeNo.toString())}
                </Text>

                <Text style={styles.stopsLabel}>STOPS</Text>

                <View style={styles.stopContainer}>
                    {displayedStops.map((stop, index) => (
                        <View key={index} style={styles.stopTag}>
                            <Text style={styles.stopText}>{highlight(stop)}</Text>
                        </View>
                    ))}

                    {!expanded && remaining > 0 && (
                        <TouchableOpacity
                            onPress={() => setExpanded(true)}
                            style={styles.moreTag}
                        >
                            <Text style={styles.moreText}>+{remaining} more</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {expanded && stops.length > 3 && (
                    <TouchableOpacity onPress={() => setExpanded(false)}>
                        <Text style={styles.viewLess}>View less</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Right Side Bus Icon */}
            <View style={styles.iconCircle}>
                <Text style={{ color: "#fff", fontSize: 20 }}>🚌</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#03111fff",
        padding: 20,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#330000",
        flexDirection: "row",
        alignItems: "center",
    },

    title: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "800",
        marginBottom: 6,
    },

    route: {
        color: "#ffffffff",
        fontSize: 15,
        fontWeight: "700",
        marginBottom: 12,
    },

    stopsLabel: {
        color: "#bbb",
        fontSize: 13,
        marginBottom: 8,
    },

    stopContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        maxWidth: "90%",
    },

    stopTag: {
        backgroundColor: "#1c1a18ff",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginBottom: 8,
    },

    stopText: {
        color: "#fff",
        fontSize: 13,
    },

    // Highlight styles
    normalText: {
        color: "#fff",
    },
    highlight: {
        color: "yellow",
        fontWeight: "bold",
    },

    moreTag: {
        backgroundColor: "#ff1a1a",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
    },

    moreText: { color: "#fff", fontWeight: "600" },

    viewLess: {
        color: "#ff6666",
        marginTop: 10,
        fontWeight: "600",
    },

    iconCircle: {
        width: 45,
        height: 45,
        borderRadius: 40,
        backgroundColor: "#ff1a1a",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 10,
    },
});
