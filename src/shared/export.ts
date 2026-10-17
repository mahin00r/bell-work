import { repository } from './storage';
import { today } from './dates';
import { useStore } from './store';
export async function exportData() {
  try {
    const state = await repository.get();
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `bell-work-backup-${today()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    useStore.setState({ error: 'The backup could not be exported. Please try again.' });
  }
}
