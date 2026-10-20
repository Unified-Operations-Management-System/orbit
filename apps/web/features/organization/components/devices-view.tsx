"use client";

import { useState } from "react";
import { Badge, Button, DataTable, Dialog, Input, Select } from "@/components/ui";
import { deviceTeams, deviceTypes, initialDevices, pairingCode, type Device, type DeviceType } from "../devices-data";

export function DevicesView() {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [registering, setRegistering] = useState(false);
  const [code, setCode] = useState<string>();
  const [name, setName] = useState("");
  const [type, setType] = useState<DeviceType>("Tablet");
  const [team, setTeam] = useState(deviceTeams[0] as string);
  const [error, setError] = useState<string>();
  const [revoking, setRevoking] = useState<Device | null>(null);

  const closeRegister = () => {
    setRegistering(false);
    setCode(undefined);
    setName("");
    setType("Tablet");
    setTeam(deviceTeams[0] as string);
    setError(undefined);
  };

  const register = () => {
    if (!name.trim()) return setError("Enter a device name.");
    setDevices((ds) => [
      { id: Date.now(), name: name.trim(), type, assignedTo: team, lastSeen: "Never", status: "Active" },
      ...ds,
    ]);
    setCode(pairingCode());
    setError(undefined);
  };

  const revoke = () => {
    if (!revoking) return;
    setDevices((ds) => ds.map((d) => (d.id === revoking.id ? { ...d, status: "Revoked" } : d)));
    setRevoking(null);
  };

  return (
    <section aria-label="Devices">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[22px] font-bold">Devices</h2>
        <Button onClick={() => setRegistering(true)}>Register device</Button>
      </div>
      <DataTable
        rowKey={(d) => d.id}
        rows={devices}
        columns={[
          {
            key: "device",
            header: "Device",
            render: (d) => (
              <div>
                <div className="font-medium">{d.name}</div>
                <div className="text-sm text-muted">{d.type}</div>
              </div>
            ),
          },
          { key: "assigned", header: "Assigned to", render: (d) => d.assignedTo },
          { key: "seen", header: "Last seen", render: (d) => d.lastSeen },
          {
            key: "status",
            header: "Status",
            render: (d) => <Badge tone={d.status === "Active" ? "success" : "neutral"}>{d.status}</Badge>,
          },
          {
            key: "actions",
            header: "",
            align: "right",
            render: (d) =>
              d.status === "Active" ? (
                <Button variant="ghost" onClick={() => setRevoking(d)}>
                  Revoke
                </Button>
              ) : null,
          },
        ]}
      />

      <Dialog open={registering} onClose={closeRegister} title="Register device">
        {code ? (
          <div className="flex flex-col gap-4">
            <p className="text-muted">Enter this code on the device</p>
            <p className="text-center text-[32px] font-extrabold tracking-widest">{code}</p>
            <div className="flex justify-end">
              <Button onClick={closeRegister}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Input label="Device name" value={name} onChange={(e) => setName(e.target.value)} error={error} required />
            <Select
              label="Type"
              value={type}
              onChange={(v) => setType(v as DeviceType)}
              options={deviceTypes.map((t) => ({ value: t, label: t }))}
            />
            <Select
              label="Assigned to"
              value={team}
              onChange={setTeam}
              options={deviceTeams.map((t) => ({ value: t, label: t }))}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={closeRegister}>
                Cancel
              </Button>
              <Button onClick={register}>Register device</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!revoking} onClose={() => setRevoking(null)} title="Revoke device?">
        <p className="text-muted">
          This device is signed out right away and can&apos;t be used again until it&apos;s registered.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRevoking(null)}>
            Cancel
          </Button>
          <Button onClick={revoke}>Revoke device</Button>
        </div>
      </Dialog>
    </section>
  );
}
